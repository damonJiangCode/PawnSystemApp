#!/usr/bin/env node

const { Pool } = require("pg");
const {
  readEmployeePinSecret,
  hashEmployeePin,
} = require("./employee-pin.cjs");

const shouldCommit = process.argv.includes("--commit");

const readDbConfig = () => {
  for (const key of [
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
  ]) {
    if (!process.env[key]) {
      throw new Error(`Set ${key} in private environment configuration.`);
    }
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
};

const main = async () => {
  const pinSecret = readEmployeePinSecret();
  const dbConfig = readDbConfig();
  const pool = new Pool(dbConfig);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE employee IN ACCESS EXCLUSIVE MODE");

    const columns = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'employee'
         AND column_name IN ('password', 'pin_hash')`,
    );
    const names = new Set(columns.rows.map((row) => row.column_name));

    if (!names.has("password")) {
      await client.query("ROLLBACK");
      if (!names.has("pin_hash")) {
        throw new Error("employee has neither password nor pin_hash.");
      }
      console.log("employee.password is already converted to pin_hash.");
      return;
    }

    const employees = await client.query(
      "SELECT employee_number, password FROM employee ORDER BY employee_number",
    );
    const empty = employees.rows.filter(
      (row) => !String(row.password ?? "").trim(),
    );
    if (empty.length) {
      throw new Error(
        `Employees with empty passwords: ${empty.map((row) => row.employee_number).join(", ")}`,
      );
    }

    const hashed = employees.rows.map((row) => ({
      employee_number: row.employee_number,
      pin_hash: hashEmployeePin(row.password, pinSecret),
    }));
    const byHash = new Map();
    for (const row of hashed) {
      byHash.set(row.pin_hash, [
        ...(byHash.get(row.pin_hash) ?? []),
        row.employee_number,
      ]);
    }
    const conflicts = [...byHash.values()].filter(
      (numbers) => numbers.length > 1,
    );
    if (conflicts.length) {
      throw new Error(
        `Employees whose trimmed passwords collide: ${conflicts.map((numbers) => numbers.join("/")).join(", ")}`,
      );
    }

    await client.query(
      "ALTER TABLE employee ADD COLUMN IF NOT EXISTS pin_hash TEXT",
    );
    await client.query(
      `UPDATE employee e SET pin_hash = h.pin_hash
       FROM unnest($1::int[], $2::text[]) AS h(employee_number, pin_hash)
       WHERE e.employee_number = h.employee_number`,
      [
        hashed.map((row) => row.employee_number),
        hashed.map((row) => row.pin_hash),
      ],
    );
    await client.query(
      "ALTER TABLE employee ALTER COLUMN pin_hash SET NOT NULL",
    );
    await client.query(
      "ALTER TABLE employee ADD CONSTRAINT employee_pin_hash_key UNIQUE (pin_hash)",
    );
    await client.query("ALTER TABLE employee DROP COLUMN password");

    await client.query(shouldCommit ? "COMMIT" : "ROLLBACK");
    console.log(
      `Employee PIN conversion ${shouldCommit ? "committed" : "previewed (run with --commit to apply)"}: ${hashed.length} employees on ${dbConfig.database}.`,
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
