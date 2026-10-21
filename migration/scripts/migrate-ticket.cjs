#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const csv = require("csv-parser");
const { Pool } = require("pg");

const migrationRoot = path.resolve(__dirname, "..");
const sourceDbPath = path.join(migrationRoot, "source", "superpawnconv.mdb");
const summaryDir =
  process.env.MIGRATION_REPORT_DIR || path.join(migrationRoot, "reports");
const reportPath = path.join(summaryDir, "ticket-migration.md");
const locationMappingPath = path.join(
  migrationRoot,
  "mappings",
  "location-mapping.json",
);
const shouldCommit = process.argv.includes("--commit");

const INSERT_BATCH_SIZE = 1000;
const PENDING_EMPLOYEE_PREFIX = "Legacy Employee";

const dbConfig = {
  user: process.env.DB_USER || "moneyexpress",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "pawnsystemdb_migration",
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
};

const normalizeText = (value) => String(value ?? "").trim();
const normalizeUpper = (value) => normalizeText(value).toUpperCase();
const parseNumber = (value) => {
  const text = normalizeText(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const truthy = (value) => {
  const normalized = normalizeUpper(value);
  return normalized === "1" || normalized === "-1" || normalized === "TRUE";
};
const increment = (map, key, amount = 1) =>
  map.set(key, (map.get(key) || 0) + amount);
const sortedCounts = (map) =>
  [...map.entries()].sort(
    (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])),
  );
const formatCounts = (map, limit = 50) => {
  const rows = sortedCounts(map).slice(0, limit);
  if (!rows.length) return "_none_";
  return [
    "```txt",
    ...rows.map(
      ([label, count]) => `${String(count).padStart(7)}  ${String(label)}`,
    ),
    "```",
  ].join("\n");
};

const loadLocationMapping = () => {
  const mapping = new Map();
  const rules = JSON.parse(fs.readFileSync(locationMappingPath, "utf8"));
  if (!Array.isArray(rules))
    throw new Error("Location mapping must be an array.");
  for (const rule of rules) {
    if (
      !rule ||
      Object.keys(rule).sort().join(",") !==
        "legacy_location,mapped_location" ||
      ![rule.legacy_location, rule.mapped_location].every(
        (value) => typeof value === "string" && value.trim(),
      )
    ) {
      throw new Error(
        "Location mappings must contain only legacy_location and mapped_location non-empty strings.",
      );
    }
    const source = normalizeUpper(rule.legacy_location);
    const target = normalizeUpper(rule.mapped_location);
    if (mapping.has(source) && mapping.get(source) !== target) {
      throw new Error("Conflicting rules in location mapping input.");
    }
    mapping.set(source, target);
  }
  if (!mapping.size) throw new Error("Location mapping rules were not loaded.");
  return mapping;
};

const normalizeLocationVariant = (rawLocation) => {
  const raw = normalizeUpper(rawLocation);
  const compact = raw.replace(/\s+/g, "");

  const directMappings = {
    BIWK: "BIWK",
    WATM: "W-M",
    WATL: "W-L",
  };
  if (directMappings[compact]) return directMappings[compact];

  let match = compact.match(/^C'([1-5])$/);
  if (match) return `C${match[1]}`;

  match = compact.match(/^RR'([A-Z])$/);
  if (match) return `RR-${match[1]}`;

  match = compact.match(/^R'([A-Z])$/);
  if (match) return `RR-${match[1]}`;

  match = compact.match(/^W'([LM])$/);
  if (match) return `W-${match[1]}`;

  match = raw.match(/^F\s+([0-9])$/);
  if (match) return `F${match[1]}`;

  return raw;
};

const resolveLocation = (rawLocation, locationMapping, targetLocations) => {
  const normalizedLocation = normalizeLocationVariant(rawLocation);

  if (targetLocations.has(normalizedLocation)) {
    return normalizedLocation;
  }

  const mappedLocation = locationMapping.get(normalizeUpper(rawLocation));
  if (mappedLocation && mappedLocation !== "UNKNOWN") {
    return mappedLocation;
  }

  if (targetLocations.has(normalizeUpper(rawLocation))) {
    return normalizeUpper(rawLocation);
  }

  return mappedLocation || "UNKNOWN";
};

const parseLegacyDate = (value, { allowSentinel = false } = {}) => {
  const raw = normalizeText(value);
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) return { value: null, reason: raw ? "invalid" : "blank" };

  const month = Number(match[1]);
  const day = Number(match[2]);
  const yearText = match[3];
  const rawYear = Number(yearText);
  const year =
    yearText.length === 2
      ? rawYear <= 30
        ? 2000 + rawYear
        : 1900 + rawYear
      : rawYear;

  if (!allowSentinel && month === 12 && day === 31 && rawYear === 99) {
    return { value: null, reason: "sentinel" };
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { value: null, reason: "invalid" };
  }
  return { value: date.toISOString().slice(0, 10), reason: null };
};

const parseLegacyTime = (value) => {
  const raw = normalizeText(value);
  const match = raw.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\s+(AM|PM))?$/i);
  if (!match) return { value: null, reason: raw ? "invalid" : "blank" };
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3]);
  const meridiem = normalizeUpper(match[4]);
  if (meridiem) {
    if (hour < 1 || hour > 12) return { value: null, reason: "invalid" };
    if (meridiem === "AM") hour = hour === 12 ? 0 : hour;
    if (meridiem === "PM") hour = hour === 12 ? 12 : hour + 12;
  }
  if (hour > 23 || minute > 59 || second > 59) {
    return { value: null, reason: "invalid" };
  }
  return {
    value: [hour, minute, second]
      .map((part) => String(part).padStart(2, "0"))
      .join(":"),
    reason: null,
  };
};

const addDays = (dateValue, days) => {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const getDaysBetween = (fromDateValue, toDateValue) => {
  const fromDate = new Date(`${fromDateValue}T00:00:00.000Z`);
  const toDate = new Date(`${toDateValue}T00:00:00.000Z`);
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
};

const resolveInterestPaidMonths = (
  row,
  status,
  transactionDateTime,
  dueDate,
) => {
  if (status === "sold" || status === "sold_expired") {
    return { value: 0, reason: "sell ticket" };
  }

  const originalDueDays = parseNumber(row.SA100NODUEDAY);
  if (
    transactionDateTime &&
    dueDate &&
    Number.isInteger(originalDueDays) &&
    originalDueDays > 0
  ) {
    const elapsedDays = getDaysBetween(
      transactionDateTime.slice(0, 10),
      dueDate,
    );
    const extensionDays = elapsedDays - originalDueDays;

    if (extensionDays >= 0 && extensionDays % 30 === 0) {
      return {
        value: extensionDays / 30,
        reason: "derived from dates and original due days",
      };
    }
  }

  const legacyPaymentCount = parseNumber(row.SA100INTFLAG);
  if (Number.isInteger(legacyPaymentCount) && legacyPaymentCount >= 0) {
    return { value: legacyPaymentCount, reason: "INTFLAG fallback" };
  }

  return { value: null, reason: "unresolved" };
};

const combineDateTime = (
  dateValue,
  timeValue,
  { optional = false, allowSentinelDate = false } = {},
) => {
  const date = parseLegacyDate(dateValue, { allowSentinel: allowSentinelDate });
  const time = parseLegacyTime(timeValue);
  if (!date.value) return { value: null, reason: date.reason };
  if (!time.value) {
    return optional
      ? { value: `${date.value} 00:00:00`, reason: `${time.reason} time` }
      : { value: null, reason: `${time.reason} time` };
  }
  return { value: `${date.value} ${time.value}`, reason: null };
};

const candidateStatus = (row) => {
  const type = normalizeUpper(row.SA100TYPEOFTR);
  const isPayback = truthy(row.SA100PAYBACK);
  const rawLocation = normalizeUpper(row.SA100LOCATION);

  if (type === "E" && rawLocation === "BIWK")
    return { value: "sold_expired", reason: "E at BIWK" };
  if (type === "E") return { value: "pawned_expired", reason: "E" };
  if (type === "B" || type === "A")
    return { value: "pawned_picked_up", reason: `${type} treated as B` };
  if (type === "S" && isPayback)
    return { value: "pawned_picked_up", reason: "S/stolen with payback" };
  if (type === "S") return { value: "pawned", reason: "S/stolen active" };
  if (type === "P" && isPayback)
    return { value: "pawned_picked_up", reason: "P treated as P with payback" };
  if (type === "P") return { value: "pawned", reason: "P treated as active P" };
  return { value: null, reason: `unresolved type ${type || "<blank>"}` };
};

const candidateAmount = (row, status) => {
  const pawnAmount = parseNumber(row.SA100AMOUNTPAWN);
  const paidAmount = parseNumber(row.SA100AMOUNTPAY);
  if (pawnAmount !== undefined && pawnAmount > 0) {
    return { value: pawnAmount, reason: "pawn amount" };
  }
  if (
    (status.value === "sold" || status.value === "sold_expired") &&
    paidAmount !== undefined &&
    paidAmount > 0
  ) {
    return { value: paidAmount, reason: "sale amount from amount paid" };
  }
  return { value: pawnAmount ?? 0, reason: "zero amount allowed" };
};

const candidatePickupAmountPaid = (row, status) => {
  if (status.value !== "pawned_picked_up") {
    return { value: null, reason: "not picked up" };
  }
  const amountPaidBack = parseNumber(row.SA100AMOUNPB) || 0;
  const amountPay = parseNumber(row.SA100AMOUNTPAY) || 0;
  if (amountPaidBack > 0)
    return { value: amountPaidBack, reason: "SA100AMOUNPB" };
  if (amountPay > 0)
    return { value: amountPay, reason: "SA100AMOUNTPAY fallback" };
  return { value: 0, reason: "zero pickup amount" };
};

const loadTicketNumberOccurrencePlan = () =>
  new Promise((resolve, reject) => {
    const totals = new Map();
    const child = spawn("mdb-export", [
      "-b",
      "strip",
      sourceDbPath,
      "SA100TRAN",
    ]);
    let stderr = "";
    child.stdout.pipe(csv()).on("data", (row) => {
      const ticketNumber = normalizeText(row.SA100TRANACTNO);
      if (ticketNumber) increment(totals, ticketNumber);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(totals);
      else reject(new Error(`mdb-export SA100TRAN failed: ${stderr}`));
    });
  });

const streamLegacyTickets = (onRow) =>
  new Promise((resolve, reject) => {
    const child = spawn("mdb-export", [
      "-b",
      "strip",
      sourceDbPath,
      "SA100TRAN",
    ]);
    let stderr = "";
    const parser = csv();
    child.stdout.pipe(parser);
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);

    const closePromise = new Promise((closeResolve) => {
      child.on("close", closeResolve);
    });

    (async () => {
      for await (const row of parser) {
        await onRow(row);
      }

      const code = await closePromise;
      if (code === 0) resolve();
      else reject(new Error(`mdb-export SA100TRAN failed: ${stderr}`));
    })().catch((error) => {
      child.kill();
      reject(error);
    });
  });

const buildInsert = (tickets) => {
  const columns = [
    "ticket_number",
    "transaction_datetime",
    "is_lost",
    "is_stolen",
    "location",
    "description",
    "due_date",
    "amount",
    "onetime_fee",
    "interest_paid_months",
    "interested_datetime",
    "employee_name",
    "pickup_datetime",
    "pickup_amount_paid",
    "expire_date",
    "status",
    "status_updated_at",
    "client_number",
  ];
  const values = [];
  const placeholders = tickets.map((ticket, rowIndex) => {
    const rowPlaceholders = columns.map((_, columnIndex) => {
      const parameterIndex = rowIndex * columns.length + columnIndex + 1;
      return `$${parameterIndex}`;
    });
    values.push(...columns.map((column) => ticket[column]));
    return `(${rowPlaceholders.join(",")})`;
  });

  return {
    text: `
      INSERT INTO ticket (${columns.join(",")})
      VALUES ${placeholders.join(",")}
    `,
    values,
  };
};

const insertBatch = async (client, tickets) => {
  if (!tickets.length) return;
  const query = buildInsert(tickets);
  await client.query(query.text, query.values);
};

const main = async () => {
  fs.mkdirSync(summaryDir, { recursive: true });
  if (!process.env.DB_PASSWORD) {
    throw new Error("Set DB_PASSWORD in private environment configuration.");
  }

  const pool = new Pool(dbConfig);

  const client = await pool.connect();
  const locationMapping = loadLocationMapping();
  const ticketOccurrenceTotals = await loadTicketNumberOccurrencePlan();
  const ticketOccurrenceIndex = new Map();
  const statusCounts = new Map();
  const statusRuleCounts = new Map();
  const amountCounts = new Map();
  const pickupAmountPaidCounts = new Map();
  const interestPaidMonthSourceCounts = new Map();
  const warningCounts = new Map();
  const blockerCounts = new Map();

  let total = 0;
  let inserted = 0;
  let skippedDuplicateEarlierRows = 0;
  let missingClientsMappedToOther = 0;
  let batch = [];

  try {
    await client.query("BEGIN");

    const [clientsResult, locationsResult, otherClientResult] =
      await Promise.all([
        client.query("SELECT client_number FROM client"),
        client.query("SELECT location FROM location"),
        client.query(
          "SELECT client_number FROM client WHERE first_name = 'Unknown' AND last_name = 'Legacy Client' ORDER BY client_number LIMIT 1",
        ),
      ]);
    const targetClients = new Set(
      clientsResult.rows.map((row) => String(row.client_number)),
    );
    const targetLocations = new Set(
      locationsResult.rows.map((row) => normalizeUpper(row.location)),
    );
    const otherClientNumber = otherClientResult.rows[0]?.client_number
      ? String(otherClientResult.rows[0].client_number)
      : null;

    if (shouldCommit) {
      await client.query("TRUNCATE TABLE ticket RESTART IDENTITY CASCADE");
    }

    await streamLegacyTickets(async (row) => {
      total += 1;
      const ticketNumberText = normalizeText(row.SA100TRANACTNO);
      const occurrenceTotal = ticketOccurrenceTotals.get(ticketNumberText) || 0;
      const occurrenceIndex =
        (ticketOccurrenceIndex.get(ticketNumberText) || 0) + 1;
      ticketOccurrenceIndex.set(ticketNumberText, occurrenceIndex);
      if (
        ticketNumberText &&
        occurrenceTotal > 1 &&
        occurrenceIndex < occurrenceTotal
      ) {
        skippedDuplicateEarlierRows += 1;
        increment(warningCounts, "duplicate earlier row skipped");
        return;
      }

      const ticketNumber = Number(ticketNumberText);
      const blockers = [];
      if (
        !ticketNumberText ||
        !Number.isSafeInteger(ticketNumber) ||
        ticketNumber <= 0
      ) {
        blockers.push("missing/invalid ticket number");
      }

      const rawLocation = normalizeUpper(row.SA100LOCATION);
      const mappedLocation = resolveLocation(
        rawLocation,
        locationMapping,
        targetLocations,
      );
      if (!targetLocations.has(normalizeUpper(mappedLocation))) {
        blockers.push("mapped location missing from target");
      }

      let clientNumber = normalizeText(row.SA100CLIENT);
      if (!clientNumber || !targetClients.has(clientNumber)) {
        if (!otherClientNumber) {
          blockers.push("client missing from target");
        } else {
          clientNumber = otherClientNumber;
          missingClientsMappedToOther += 1;
          increment(
            warningCounts,
            "client missing from target mapped to Unknown Legacy Client",
          );
        }
      }

      const transactionDateTime = combineDateTime(
        row.SA100DATE,
        row.SA100TIME,
        {
          optional: true,
          allowSentinelDate: true,
        },
      );
      if (!transactionDateTime.value) {
        blockers.push("invalid transaction date/time");
      }

      let dueDate = parseLegacyDate(row.SA100DUEDATE);
      if (
        !dueDate.value &&
        dueDate.reason === "sentinel" &&
        transactionDateTime.value
      ) {
        const dueDay = parseNumber(row.SA100NODUEDAY);
        if (Number.isInteger(dueDay) && dueDay > 0) {
          dueDate = {
            value: addDays(transactionDateTime.value.slice(0, 10), dueDay),
            reason: "derived",
          };
          increment(
            warningCounts,
            "due date derived from transaction date plus due days",
          );
        }
      }
      if (!dueDate.value) {
        blockers.push("invalid due date");
      }

      const status = candidateStatus(row);
      increment(statusCounts, status.value || "<unresolved>");
      increment(statusRuleCounts, status.reason);
      if (!status.value) {
        blockers.push("unresolved status");
      }

      const amount = candidateAmount(row, status);
      increment(amountCounts, amount.reason);
      if (amount.value < 0) {
        blockers.push("negative amount");
      }

      const interestPaidMonths = resolveInterestPaidMonths(
        row,
        status.value,
        transactionDateTime.value,
        dueDate.value,
      );
      increment(interestPaidMonthSourceCounts, interestPaidMonths.reason);
      if (interestPaidMonths.value === null) {
        blockers.push("invalid interest-paid month count");
      }

      const pickupDateTime = combineDateTime(
        row.SA100PAYBDATE,
        row.SA100PAYBTIME,
        {
          optional: true,
        },
      );
      const pickupAmountPaid = candidatePickupAmountPaid(row, status);
      increment(pickupAmountPaidCounts, pickupAmountPaid.reason);

      const interestDateTime = combineDateTime(
        row.SA100INTERESTDATE,
        row.SA100INTERESTTIME,
        { optional: true },
      );
      const expireDate = parseLegacyDate(row.SA100EXPDATE);
      const employeeNumber =
        normalizeText(row.SA100EMPLOYEENO) ||
        normalizeText(row.SA100EMPLOYEENO2) ||
        "Unknown";

      if (blockers.length) {
        for (const blocker of new Set(blockers))
          increment(blockerCounts, blocker);
        return;
      }

      const statusUpdatedAt =
        status.value === "pawned_picked_up"
          ? pickupDateTime.value || transactionDateTime.value
          : status.value === "pawned_expired" || status.value === "sold_expired"
            ? expireDate.value || dueDate.value
            : transactionDateTime.value;

      batch.push({
        ticket_number: ticketNumber,
        transaction_datetime: transactionDateTime.value,
        is_lost: false,
        is_stolen: normalizeUpper(row.SA100TYPEOFTR) === "S",
        location: mappedLocation,
        description: normalizeText(row.SA100REMARK) || null,
        due_date: dueDate.value,
        amount: amount.value,
        onetime_fee: parseNumber(row.SA100ONETIMEFEE) || 0,
        interest_paid_months: interestPaidMonths.value,
        interested_datetime: interestDateTime.value,
        employee_name: `${PENDING_EMPLOYEE_PREFIX} ${employeeNumber}`,
        pickup_datetime:
          status.value === "pawned_picked_up" ? pickupDateTime.value : null,
        pickup_amount_paid: pickupAmountPaid.value,
        expire_date:
          status.value === "pawned_expired" || status.value === "sold_expired"
            ? expireDate.value || dueDate.value
            : null,
        status: status.value,
        status_updated_at: statusUpdatedAt,
        client_number: Number(clientNumber),
      });

      if (batch.length >= INSERT_BATCH_SIZE) {
        if (shouldCommit) {
          await insertBatch(client, batch);
        }
        inserted += batch.length;
        batch = [];
      }
    });

    if (batch.length) {
      if (shouldCommit) {
        await insertBatch(client, batch);
      }
      inserted += batch.length;
      batch = [];
    }

    const hasBlockers = sortedCounts(blockerCounts).length > 0;

    if (shouldCommit && !hasBlockers) {
      await client.query(`
        UPDATE ticket t
        SET employee_name = COALESCE(NULLIF(e.nickname, ''), e.first_name)
        FROM employee e
        WHERE t.employee_name = 'Legacy Employee ' || e.employee_number::text
      `);
      await client.query(
        "SELECT setval(pg_get_serial_sequence('ticket', 'ticket_number'), (SELECT MAX(ticket_number) FROM ticket))",
      );
      await client.query("COMMIT");
    } else {
      await client.query("ROLLBACK");
    }

    const targetCountResult =
      shouldCommit && !hasBlockers
        ? await pool.query("SELECT COUNT(*)::int AS count FROM ticket")
        : { rows: [{ count: 0 }] };

    const report = `# Ticket Migration

Generated: ${new Date().toISOString()}

Source: \`SA100TRAN\` in \`superpawnconv.mdb\`

Target database: \`${dbConfig.database}\`

Mode: ${shouldCommit ? "commit" : "preview"}

## Summary

| Metric | Count |
| --- | ---: |
| Legacy ticket rows scanned | ${total.toLocaleString()} |
| Duplicate earlier rows skipped | ${skippedDuplicateEarlierRows.toLocaleString()} |
| Rows ${shouldCommit && !hasBlockers ? "inserted" : "insertable"} | ${inserted.toLocaleString()} |
| Target ticket rows after commit | ${Number(targetCountResult.rows[0].count).toLocaleString()} |
| Missing clients mapped to Unknown Legacy Client | ${missingClientsMappedToOther.toLocaleString()} |

## Blockers

${formatCounts(blockerCounts)}

## Statuses

${formatCounts(statusCounts)}

## Status Rules

${formatCounts(statusRuleCounts)}

## Amount Sources

${formatCounts(amountCounts)}

## Pickup Amount Paid Sources

${formatCounts(pickupAmountPaidCounts)}

## Interest Paid Month Sources

${formatCounts(interestPaidMonthSourceCounts)}

## Warnings

${formatCounts(warningCounts)}

## Employee Backfill

During insert, \`employee_name\` is staged as \`${PENDING_EMPLOYEE_PREFIX} {legacy_employee_number}\`.
Before commit, migrated employee nicknames are backfilled from the \`employee\` table.
The ticket number identity sequence is also advanced to the maximum migrated ticket number.
`;

    fs.writeFileSync(reportPath, report);

    if (hasBlockers) {
      throw new Error("Ticket migration has blockers; see ticket-migration.md");
    }

    console.log(`Ticket migration ${shouldCommit ? "committed" : "previewed"}`);
    console.log(
      `Rows ${shouldCommit ? "inserted" : "insertable"}: ${inserted.toLocaleString()}`,
    );
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
