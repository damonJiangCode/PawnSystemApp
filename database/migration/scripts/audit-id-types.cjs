#!/usr/bin/env node
// Read-only source/target audit using the exact same JSON rules as the importer.
// Writes private aggregate reports; never changes mappings or database records.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createHash } = require("node:crypto");
const { loadIdTypeMapping, resolveIdType } = require("./id-type-mapping.cjs");
const assert = require("node:assert/strict");
const csv = require("csv-parser");
const { Pool } = require("pg");
const root = path.resolve(__dirname, "../../..");
const migration = path.join(root, "database/migration");
const mappingPath = path.join(migration, "mappings/id-type-mapping.json");
const text = (value) => String(value ?? "").trim();
const upper = (value) => text(value).toUpperCase();
const clean = (value) => (text(value) === "-" ? "" : text(value));
const digits = (value) => text(value).replace(/\D/g, "");

function readTable(table, onRow) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", [
      "run",
      "--rm",
      "--network",
      "none",
      "--entrypoint",
      "mdb-export",
      "--mount",
      `type=bind,source=${path.join(migration, "source")},target=/source,readonly`,
      "pawnsystem-migration",
      "-b",
      "strip",
      "/source/superpawnconv.mdb",
      table,
    ]);
    let stderr = "";
    let ended = false;
    let closed = false;
    let count = 0;
    const parser = csv();
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    parser.on("error", (error) => {
      child.kill();
      reject(error);
    });
    parser.on("data", (row) => {
      const normalized = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key.toUpperCase(), value]),
      );
      onRow(normalized, ++count);
    });
    const finish = () => {
      if (ended && closed) resolve(count);
    };
    parser.on("end", () => {
      ended = true;
      finish();
    });
    child.on("close", (code) => {
      if (code !== 0)
        return reject(new Error(`${table} export failed: ${stderr}`));
      closed = true;
      finish();
    });
    child.stdout.pipe(parser);
  });
}

async function sha256(file) {
  const hash = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function main() {
  const sourcePath = path.join(migration, "source/superpawnconv.mdb");
  const initialStat = fs.statSync(sourcePath);
  if (process.argv.includes("--create-draft"))
    throw new Error(
      "The mapping is now a runtime input. Edit its JSON explicitly; the audit never rewrites it.",
    );
  const mappingHash = await sha256(mappingPath);
  const mapping = loadIdTypeMapping(mappingPath);
  const mappedTypes = Object.fromEntries(
    [...mapping.rules]
      .filter(([, rule]) => rule.action === "map")
      .map(([code, rule]) => [code, rule.mapped_type]),
  );
  const pool = new Pool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5433),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  let targets;
  try {
    // Enforce read-only access at PostgreSQL transaction level.
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN READ ONLY");
      targets = (
        await connection.query(
          "SELECT type, is_active FROM public.id_type ORDER BY type",
        )
      ).rows;
      await connection.query("COMMIT");
    } finally {
      connection.release();
    }
  } finally {
    await pool.end();
  }
  const targetSet = new Set(targets.map((row) => row.type));
  const dictionary = new Map();
  const dictionaryRows = await readTable("AR400ID", (row) => {
    const code = upper(row.AR400IDCODE);
    if (!dictionary.has(code)) dictionary.set(code, new Set());
    dictionary.get(code).add(text(row.AR400IDDESCRIPTION));
  });
  const totals = {
    source_client_rows: 0,
    total_slots: 0,
    empty_slots: 0,
    occupied_slots: 0,
    importable: 0,
    mapped_missing_target: 0,
    mapped_missing_value: 0,
    phone_entries: 0,
    unknown_code: 0,
  };
  const clientCounts = {
    zero_importable: 0,
    one_importable: 0,
    two_or_more_importable: 0,
    with_nonimportable_slots: 0,
    with_phone_entries: 0,
  };
  const phone = {
    with_value: 0,
    without_value: 0,
    exact_existing_phone_match: 0,
    existing_phone_blank: 0,
    different_existing_phone: 0,
    no_digits: 0,
  };
  const byCode = new Map();
  await readTable("AR200CLIENT", (row) => {
    totals.source_client_rows++;
    let imported = 0,
      failed = 0,
      phoneCount = 0;
    for (let slot = 1; slot <= 5; slot++) {
      totals.total_slots++;
      const code = upper(row[`AR200ID_${slot}`]);
      const value = clean(row[`AR200ID_${slot}_NO`]);
      if (!code && !value) {
        totals.empty_slots++;
        continue;
      }
      totals.occupied_slots++;
      const rule = resolveIdType(mapping, code);
      const target = rule.action === "map" ? rule.mapped_type : null;
      let category;
      if (!target) category = code === "PHO" ? "phone_entries" : "unknown_code";
      else if (!targetSet.has(target)) category = "mapped_missing_target";
      else if (!value) category = "mapped_missing_value";
      else category = "importable";
      totals[category]++;
      if (category === "importable") imported++;
      else failed++;
      if (!byCode.has(code))
        byCode.set(code, {
          code,
          occupied: 0,
          with_value: 0,
          importable: 0,
          mapped_missing_target: 0,
          mapped_missing_value: 0,
          phone_entries: 0,
          unknown_code: 0,
        });
      const group = byCode.get(code);
      group.occupied++;
      group.with_value += Number(Boolean(value));
      group[category]++;
      if (code === "PHO") {
        phoneCount++;
        if (!value) {
          phone.without_value++;
          continue;
        }
        phone.with_value++;
        const current = digits(row.AR200PHONE),
          combined = digits(
            `${text(row.AR200AREACODE)} ${text(row.AR200PHONE)}`,
          ),
          candidate = digits(value);
        if (!candidate) phone.no_digits++;
        else if (candidate === current || candidate === combined)
          phone.exact_existing_phone_match++;
        else if (!clean(row.AR200PHONE)) phone.existing_phone_blank++;
        else phone.different_existing_phone++;
      }
    }
    clientCounts[
      imported === 0
        ? "zero_importable"
        : imported === 1
          ? "one_importable"
          : "two_or_more_importable"
    ]++;
    if (failed) clientCounts.with_nonimportable_slots++;
    if (phoneCount) clientCounts.with_phone_entries++;
  });
  assert.equal(totals.total_slots, totals.source_client_rows * 5);
  assert.equal(totals.total_slots, totals.empty_slots + totals.occupied_slots);
  assert.equal(
    totals.occupied_slots,
    totals.importable +
      totals.mapped_missing_target +
      totals.mapped_missing_value +
      totals.phone_entries +
      totals.unknown_code,
  );
  assert.equal(
    totals.importable,
    [...byCode.values()].reduce((sum, row) => sum + row.importable, 0),
  );
  assert.equal(
    totals.source_client_rows,
    clientCounts.zero_importable +
      clientCounts.one_importable +
      clientCounts.two_or_more_importable,
  );
  assert.equal(
    phone.with_value,
    phone.exact_existing_phone_match +
      phone.existing_phone_blank +
      phone.different_existing_phone +
      phone.no_digits,
  );
  const hash = await sha256(sourcePath);
  const finalStat = fs.statSync(sourcePath);
  assert.equal(initialStat.size, finalStat.size, "Source changed during audit");
  assert.equal(
    initialStat.mtimeMs,
    finalStat.mtimeMs,
    "Source changed during audit",
  );
  assert.equal(
    await sha256(mappingPath),
    mappingHash,
    "Mapping changed during audit",
  );
  const codes = [
    ...new Set([
      ...dictionary.keys(),
      ...byCode.keys(),
      ...mapping.rules.keys(),
    ]),
  ].sort();
  const reportDir = path.join(
    migration,
    "reports",
    `id-type-audit-${new Date().toISOString().replace(/[:.]/g, "-")}`,
  );
  fs.mkdirSync(reportDir, { recursive: true });
  const report = {
    generated_at: new Date().toISOString(),
    scope:
      "ID slots only; this is not a full client/ticket migration eligibility check. Counts apply the shared JSON mapping and current target types; no import was performed.",
    source: {
      file: "superpawnconv.mdb",
      bytes: initialStat.size,
      sha256: hash,
      dictionary_table: "AR400ID",
      dictionary_rows: dictionaryRows,
      client_table: "AR200CLIENT",
      slots_per_client: 5,
    },
    target_id_types: targets,
    totals,
    client_counts: clientCounts,
    phone_review: phone,
    by_code: codes.map((code) => ({
      code,
      descriptions: [...(dictionary.get(code) ?? [])],
      current_target: mappedTypes[code] ?? null,
      ...(byCode.get(code) ?? {
        occupied: 0,
        with_value: 0,
        importable: 0,
        mapped_missing_target: 0,
        mapped_missing_value: 0,
        phone_entries: 0,
        unknown_code: 0,
      }),
    })),
    missing_targets: [
      ...new Set(
        Object.values(mappedTypes).filter((type) => !targetSet.has(type)),
      ),
    ],
    mapping_file: "database/migration/mappings/id-type-mapping.json",
    mapping_sha256: mappingHash,
  };
  fs.writeFileSync(
    path.join(reportDir, "summary.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  const escape = (value) =>
    String(value ?? "")
      .replace(/\|/g, "\\|")
      .replace(/[\r\n]/g, " ");
  const md = [
    "# ID type audit",
    "",
    report.scope,
    "",
    `- Source client rows: ${totals.source_client_rows}`,
    `- Populated slots: ${totals.occupied_slots}`,
    `- Importable under current rules: ${totals.importable}`,
    `- Not importable as client_id under current rules: ${totals.occupied_slots - totals.importable}`,
    `- Empty slots: ${totals.empty_slots}`,
    "",
    "No client names, identification numbers or telephone numbers are included in these reports.",
    "",
    "## Per-code results",
    "",
    "| Code | Legacy description | Current target | Used slots | With value | Importable | Missing value | Phone/review | Unknown | Missing target |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...report.by_code.map(
      (r) =>
        `| ${escape(r.code || "<blank>")} | ${escape(r.descriptions.join(" / "))} | ${escape(r.current_target ?? "<unmapped>")} | ${r.occupied} | ${r.with_value} | ${r.importable} | ${r.mapped_missing_value} | ${r.phone_entries} | ${r.unknown_code} | ${r.mapped_missing_target} |`,
    ),
    "",
    "## Phone preservation review",
    "",
    ...Object.entries(phone).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Client ID counts (not full client eligibility)",
    "",
    ...Object.entries(clientCounts).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Reproduce",
    "",
    "Run from repository root:",
    "",
    "```bash",
    "node --env-file=.env database/migration/scripts/audit-id-types.cjs",
    "```",
    "",
    "The mapping is a versioned runtime input and is never rewritten by the audit.",
    "",
    `Source SHA-256: ${hash}`,
    "",
  ];
  fs.writeFileSync(path.join(reportDir, "summary.md"), md.join("\n"));
  console.log(
    JSON.stringify(
      {
        report_directory: path.relative(root, reportDir),
        dictionary_rows: dictionaryRows,
        totals,
        client_counts: clientCounts,
        phone_review: phone,
        missing_targets: report.missing_targets,
        unmapped: report.by_code.filter((r) => !r.current_target),
        collapsed_to_other: report.by_code.filter(
          (r) =>
            r.current_target === "Other" && r.code !== "OTH" && r.occupied > 0,
        ),
      },
      null,
      2,
    ),
  );
}
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
