#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const csv = require("csv-parser");
const { Pool } = require("pg");

const migrationRoot = path.resolve(__dirname, "..");
const sourceDbPath = path.join(migrationRoot, "source", "superpawnconv.mdb");
const summaryDir = path.join(migrationRoot, "reports");
const reportPath = path.join(summaryDir, "employee-migration.md");
const shouldCommit = process.argv.includes("--commit");

const dbConfig = {
  user: process.env.DB_USER || "moneyexpress",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "pawnsystemdb_migration",
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
};

const DEFAULT_DOB = "1900-01-01";
const DEFAULT_GENDER = "unknown";
const MANAGER_EMPLOYEE_NUMBER = 69;

const normalizeText = (value) => String(value ?? "").trim();

const parseLegacyDate = (value) => {
  const raw = normalizeText(value);
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) return "";

  const month = Number(match[1]);
  const day = Number(match[2]);
  const rawYear = Number(match[3]);
  const year =
    match[3].length === 2
      ? rawYear <= 30
        ? 2000 + rawYear
        : 1900 + rawYear
      : rawYear;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const readAccessTable = (tableName) =>
  new Promise((resolve, reject) => {
    const rows = [];
    const child = spawn("mdb-export", ["-b", "strip", sourceDbPath, tableName]);
    let stderr = "";

    child.stdout.pipe(csv()).on("data", (row) => rows.push(row));
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(rows);
      else reject(new Error(`mdb-export ${tableName} failed: ${stderr}`));
    });
  });

const buildAddress = (row) => {
  const suite = normalizeText(row.EM200SUITENO);
  const street = normalizeText(row.EM200STREET);
  const postalCode = normalizeText(row.EM200PCODE);
  const parts = [];

  if (suite && street) parts.push(`${suite} ${street}`);
  else if (suite) parts.push(suite);
  else if (street) parts.push(street);
  if (postalCode) parts.push(postalCode);

  return parts.join(", ");
};

const buildPhone = (row) => {
  const phones = [
    ["Home", row.EM200HOMEPHONE],
    ["Cell", row.EM200CELLPHONE],
    ["Work", row.EM200WorkPhone],
  ]
    .map(([label, value]) => [label, normalizeText(value)])
    .filter(([, value]) => value);

  if (phones.length === 1) return phones[0][1];
  return phones.map(([label, value]) => `${label}: ${value}`).join(" | ");
};

const mapEmployee = (row) => ({
  employee_number: Number(normalizeText(row.EM200EmployeeID)),
  first_name: normalizeText(row.EM200FirstName),
  last_name: normalizeText(row.EM200LastName),
  nickname: normalizeText(row.EM200NICKNAME),
  date_of_birth: parseLegacyDate(row.EM200Birthdate) || DEFAULT_DOB,
  gender: DEFAULT_GENDER,
  password: normalizeText(row.EM200Password),
  is_terminated: normalizeText(row.EM200Terminated) === "1",
  is_manager:
    Number(normalizeText(row.EM200EmployeeID)) === MANAGER_EMPLOYEE_NUMBER,
  address: buildAddress(row),
  phone: buildPhone(row),
  email: normalizeText(row.EM200EMAILADDRESS),
});

const buildInsert = (employees) => {
  const columns = [
    "employee_number",
    "first_name",
    "last_name",
    "nickname",
    "date_of_birth",
    "gender",
    "password",
    "is_terminated",
    "is_manager",
    "address",
    "phone",
    "email",
  ];
  const values = [];
  const placeholders = employees.map((employee, rowIndex) => {
    const rowPlaceholders = columns.map((_, columnIndex) => {
      const parameterIndex = rowIndex * columns.length + columnIndex + 1;
      return `$${parameterIndex}`;
    });
    values.push(...columns.map((column) => employee[column]));
    return `(${rowPlaceholders.join(",")})`;
  });

  return {
    text: `
      INSERT INTO employee (${columns.join(",")})
      VALUES ${placeholders.join(",")}
    `,
    values,
  };
};

const main = async () => {
  fs.mkdirSync(summaryDir, { recursive: true });
  const rows = await readAccessTable("EM200EMPLOYEE");
  const employees = rows.map(mapEmployee);

  employees.push({
    employee_number: 999,
    first_name: "Legacy",
    last_name: "Employee",
    nickname: "Legacy",
    date_of_birth: DEFAULT_DOB,
    gender: DEFAULT_GENDER,
    password: "legacy-999",
    is_terminated: true,
    is_manager: false,
    address: "",
    phone: "",
    email: "",
  });

  const invalidRows = employees.filter(
    (employee) =>
      !Number.isSafeInteger(employee.employee_number) ||
      employee.employee_number <= 0 ||
      !employee.first_name ||
      !employee.last_name ||
      !employee.nickname ||
      !employee.password,
  );

  if (invalidRows.length) {
    throw new Error(
      `Employee migration has ${invalidRows.length} invalid rows`,
    );
  }

  const duplicatePasswords = new Map();
  for (const employee of employees) {
    duplicatePasswords.set(
      employee.password,
      (duplicatePasswords.get(employee.password) || 0) + 1,
    );
  }
  const passwordConflicts = [...duplicatePasswords].filter(
    ([, count]) => count > 1,
  );
  if (passwordConflicts.length) {
    throw new Error(
      `Duplicate employee passwords: ${passwordConflicts.map(([password]) => password).join(", ")}`,
    );
  }

  if (!process.env.DB_PASSWORD) {
    throw new Error("Set DB_PASSWORD in private environment configuration.");
  }

  const pool = new Pool(dbConfig);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (shouldCommit) {
      await client.query("TRUNCATE TABLE employee RESTART IDENTITY");
      const query = buildInsert(employees);
      await client.query(query.text, query.values);
      await client.query(
        "SELECT setval(pg_get_serial_sequence('employee', 'employee_number'), (SELECT MAX(employee_number) FROM employee))",
      );
      await client.query(`
        UPDATE ticket t
        SET employee_name = COALESCE(NULLIF(e.nickname, ''), e.first_name)
        FROM employee e
        WHERE t.employee_name = 'Legacy Employee ' || e.employee_number::text
      `);
    }

    const counts = {
      source: rows.length,
      prepared: employees.length,
      terminated: employees.filter((employee) => employee.is_terminated).length,
      managers: employees.filter((employee) => employee.is_manager).length,
      defaultDob: employees.filter(
        (employee) => employee.date_of_birth === DEFAULT_DOB,
      ).length,
      withAddress: employees.filter((employee) => employee.address).length,
      withPhone: employees.filter((employee) => employee.phone).length,
      withEmail: employees.filter((employee) => employee.email).length,
    };

    if (shouldCommit) {
      await client.query("COMMIT");
    } else {
      await client.query("ROLLBACK");
    }

    console.log(
      `Employee migration ${shouldCommit ? "committed" : "previewed"}`,
    );
    console.table(counts);

    const report = `# Employee Migration

Generated: ${new Date().toISOString()}

Source: \`EM200EMPLOYEE\` in \`superpawnconv.mdb\`

Target database: \`${dbConfig.database}\`

Mode: ${shouldCommit ? "commit" : "preview"}

## Summary

| Metric | Count |
| --- | ---: |
| Legacy employee rows | ${counts.source.toLocaleString()} |
| Employees prepared | ${counts.prepared.toLocaleString()} |
| Terminated employees | ${counts.terminated.toLocaleString()} |
| Managers | ${counts.managers.toLocaleString()} |
| Default DOB rows | ${counts.defaultDob.toLocaleString()} |
| Employees with address | ${counts.withAddress.toLocaleString()} |
| Employees with phone | ${counts.withPhone.toLocaleString()} |
| Employees with email | ${counts.withEmail.toLocaleString()} |

## Rules

- Add placeholder employee \`999 / Legacy Employee\` for legacy tickets that used employee number 999.
- Set \`gender\` to \`unknown\` because the legacy employee table has no gender column.
- Set missing or invalid birth dates to \`${DEFAULT_DOB}\`.
- Map \`EM200Terminated = 1\` to \`is_terminated = true\`; terminated employee passwords cannot authorize app actions.
- Set employee \`${MANAGER_EMPLOYEE_NUMBER} / WEI FENG\` as manager.
- No employee photo field is migrated because \`EM200PICTURE\` has no usable photo rows.
- After commit, ticket \`employee_name\` placeholders are backfilled from migrated employee nicknames.
`;

    fs.writeFileSync(reportPath, report);
    console.log(`Report: ${reportPath}`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
