const fs = require("node:fs");
const path = require("node:path");

const REFERENCE_TABLES = new Set([
  "city",
  "hair_color",
  "eye_color",
  "id_type",
  "location",
  "holiday_date",
  "item_category",
  "item_subcategory",
]);
const IDENTITY_SQL = `SELECT json_build_object(
  'database', current_database(),
  'database_oid', (SELECT oid::text FROM pg_database WHERE datname = current_database()),
  'system_identifier', (SELECT system_identifier::text FROM pg_control_system())
) AS identity`;

const readMetric = (report, label) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match =
    report.match(new RegExp(`^${escaped}:\\s*([\\d,]+)\\s*$`, "m")) ||
    report.match(
      new RegExp(`^\\|\\s*${escaped}\\s*\\|\\s*([\\d,]+)\\s*\\|`, "m"),
    );
  if (!match) throw new Error(`Missing report metric: ${label}`);
  const value = Number(match[1].replace(/,/g, ""));
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`Invalid report metric: ${label}`);
  return value;
};

const previewCounts = (kind, report) => {
  if (!/^Mode: (preview|dry-run)\s*$/m.test(report))
    throw new Error("Expected a fresh preview report.");
  let counts;
  if (kind === "client") {
    if (readMetric(report, "Blocked client rows"))
      throw new Error("Client preview has blockers.");
    counts = {
      client: readMetric(report, "Prepared client rows"),
      client_id: readMetric(report, "Prepared client_id rows"),
    };
  } else if (kind === "employee") {
    counts = { employee: readMetric(report, "Employees prepared") };
  } else if (kind === "ticket") {
    const blockers = report.match(
      /^## Blockers\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m,
    );
    if (!blockers || blockers[1].trim() !== "_none_")
      throw new Error(
        "Ticket preview has blockers or an unreadable blocker section.",
      );
    counts = { ticket: readMetric(report, "Rows insertable") };
  } else if (kind === "item") {
    if (readMetric(report, "Blocker types"))
      throw new Error("Item preview has blockers.");
    counts = {
      item: readMetric(report, "Items prepared"),
      ticket_item: readMetric(report, "Ticket-item links prepared"),
    };
  } else throw new Error("Unknown preview stage.");
  if (Object.values(counts).some((count) => count === 0)) {
    throw new Error(
      "Preview prepared zero rows; review source inputs before importing.",
    );
  }
  return counts;
};

const assertEmptyDatabase = async (client) => {
  const tables = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
  );
  for (const { tablename } of tables.rows) {
    if (REFERENCE_TABLES.has(tablename)) continue;
    const identifier = '"' + tablename.replace(/"/g, '""') + '"';
    const result = await client.query(
      `SELECT EXISTS (SELECT 1 FROM public.${identifier} LIMIT 1) AS populated`,
    );
    if (result.rows[0].populated)
      throw new Error(
        "Target database already contains non-reference data. No reset or automatic resume is allowed.",
      );
  }
};

const assertCounts = async (client, expected) => {
  for (const [table, count] of Object.entries(expected)) {
    if (
      ![
        "client",
        "client_id",
        "employee",
        "ticket",
        "item",
        "ticket_item",
      ].includes(table)
    )
      throw new Error("Unexpected count table.");
    const result = await client.query(
      `SELECT COUNT(*)::int AS count FROM ${table}`,
    );
    if (Number(result.rows[0].count) !== count)
      throw new Error(`Imported ${table} count does not match its preview.`);
  }
};

const validateImportedDatabase = async (client, projectRoot) => {
  const result = await client.query(`
    WITH stats AS (
      SELECT client_number,
        COUNT(*) FILTER (WHERE status='pawned_picked_up')::int AS redeem_count,
        COUNT(*) FILTER (WHERE status='pawned_expired')::int AS expire_count,
        COUNT(*) FILTER (WHERE status IN ('sold','sold_expired') OR location='BIWK')::int AS sell_count
      FROM ticket WHERE client_number IS NOT NULL GROUP BY client_number
    )
    SELECT
      (SELECT COUNT(*) FROM ticket_item ti LEFT JOIN ticket t USING(ticket_number) WHERE t.ticket_number IS NULL)::int AS missing_tickets,
      (SELECT COUNT(*) FROM ticket_item ti LEFT JOIN item i USING(item_number) WHERE i.item_number IS NULL)::int AS missing_items,
      (SELECT COUNT(*) FROM ticket t LEFT JOIN client c USING(client_number) WHERE t.client_number IS NULL OR c.client_number IS NULL)::int AS missing_clients,
      (SELECT COUNT(*) FROM client c LEFT JOIN stats s USING(client_number)
        WHERE c.redeem_count<>COALESCE(s.redeem_count,0) OR c.expire_count<>COALESCE(s.expire_count,0) OR c.sell_count<>COALESCE(s.sell_count,0))::int AS statistics_mismatches,
      (SELECT COUNT(*) FROM ticket WHERE status='pawned' AND location='UNKNOWN')::int AS unresolved_active_locations,
      (SELECT COUNT(*) FROM (SELECT ti.item_number FROM ticket_item ti JOIN ticket t USING(ticket_number)
        WHERE t.status IN ('pawned','sold') GROUP BY ti.item_number HAVING COUNT(*)>1) conflicts)::int AS conflicting_active_items,
      (SELECT COUNT(*) FROM employee WHERE is_manager AND NOT is_terminated)::int AS active_managers
  `);
  const metrics = {
    ...result.rows[0],
    sequence_errors: 0,
    missing_photos: 0,
    invalid_photo_paths: 0,
  };
  for (const [table, column] of [
    ["client", "client_number"],
    ["employee", "employee_number"],
    ["ticket", "ticket_number"],
    ["item", "item_number"],
  ]) {
    const sequence =
      await client.query(`SELECT COALESCE(MAX(${column}),0)::text AS maximum,
      (SELECT last_value::text FROM pg_sequences WHERE schemaname='public'
        AND sequencename=split_part(pg_get_serial_sequence('${table}','${column}'),'.',2)) AS sequence_value FROM ${table}`);
    const row = sequence.rows[0];
    if (
      row.sequence_value == null ||
      BigInt(row.sequence_value) < BigInt(row.maximum)
    )
      metrics.sequence_errors++;
  }
  for (const [table, folder] of [
    ["client", "client-photos"],
    ["item", "item-photos"],
  ]) {
    const base = fs.realpathSync(
      path.join(projectRoot, "database/migration/exports", folder),
    );
    const photos = await client.query(
      `SELECT image_path FROM ${table} WHERE COALESCE(image_path,'')<>''`,
    );
    for (const { image_path: imagePath } of photos.rows) {
      const normalized = imagePath.replace(/\\/g, "/");
      const filename = path.resolve(
        projectRoot,
        normalized.startsWith("migration/exports/")
          ? `database/${normalized}`
          : imagePath,
      );
      try {
        const real = fs.realpathSync(filename);
        const relative = path.relative(base, real);
        if (path.isAbsolute(relative) || relative.startsWith(".."))
          metrics.invalid_photo_paths++;
        else if (!fs.statSync(real).isFile()) metrics.missing_photos++;
      } catch {
        metrics.missing_photos++;
      }
    }
  }
  return metrics;
};

const validationPassed = (metrics) => {
  const requiredZeroMetrics = [
    "missing_tickets",
    "missing_items",
    "missing_clients",
    "statistics_mismatches",
    "unresolved_active_locations",
    "conflicting_active_items",
    "sequence_errors",
    "missing_photos",
    "invalid_photo_paths",
  ];
  return (
    Number.isInteger(Number(metrics.active_managers)) &&
    Number(metrics.active_managers) > 0 &&
    requiredZeroMetrics.every(
      (key) => metrics[key] !== undefined && Number(metrics[key]) === 0,
    )
  );
};

module.exports = {
  IDENTITY_SQL,
  previewCounts,
  readMetric,
  assertEmptyDatabase,
  assertCounts,
  validateImportedDatabase,
  validationPassed,
};
