#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const migrationRoot = path.resolve(__dirname, "..");
const summaryDir = path.join(migrationRoot, "reports");
const reportPath = path.join(summaryDir, "client-migration.md");
const shouldCommit = process.argv.includes("--commit");

const dbConfig = {
  user: process.env.DB_USER || "moneyexpress",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "pawnsystemdb_migration",
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
};

const replaceReportSection = (existingReport, heading, section) => {
  const marker = `## ${heading}`;
  const start = existingReport.indexOf(marker);
  if (start === -1) {
    return `${existingReport.trimEnd()}\n\n${section}\n`;
  }

  const nextStart = existingReport.indexOf("\n## ", start + marker.length);
  return [
    existingReport.slice(0, start).trimEnd(),
    section,
    nextStart === -1 ? "" : existingReport.slice(nextStart).trimStart(),
  ]
    .filter(Boolean)
    .join("\n\n");
};

const formatCountRows = (rows) => {
  if (!rows.length) {
    return "_none_";
  }

  return [
    "```txt",
    ...rows.map((row) => `${String(row.count).padStart(8)}  ${row.label}`),
    "```",
  ].join("\n");
};

const main = async () => {
  fs.mkdirSync(summaryDir, { recursive: true });

  if (!process.env.DB_PASSWORD) {
    throw new Error("Set DB_PASSWORD in private environment configuration.");
  }

  const pool = new Pool(dbConfig);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const beforeTotals = await client.query(`
      SELECT
        COALESCE(SUM(redeem_count), 0)::int AS redeem_total,
        COALESCE(SUM(expire_count), 0)::int AS expire_total,
        COALESCE(SUM(sell_count), 0)::int AS sell_total
      FROM client
    `);

    const recomputedTotals = await client.query(`
      WITH stats AS (
        SELECT
          client_number,
          COUNT(*) FILTER (WHERE status = 'pawned_picked_up')::int AS redeem_count,
          COUNT(*) FILTER (WHERE status = 'pawned_expired')::int AS expire_count,
          COUNT(*) FILTER (
            WHERE status IN ('sold', 'sold_expired') OR location = 'BIWK'
          )::int AS sell_count
        FROM ticket
        WHERE client_number IS NOT NULL
        GROUP BY client_number
      )
      SELECT
        COALESCE(SUM(redeem_count), 0)::int AS redeem_total,
        COALESCE(SUM(expire_count), 0)::int AS expire_total,
        COALESCE(SUM(sell_count), 0)::int AS sell_total,
        COUNT(*)::int AS clients_with_ticket_stats
      FROM stats
    `);

    const changedClients = await client.query(`
      WITH stats AS (
        SELECT
          client_number,
          COUNT(*) FILTER (WHERE status = 'pawned_picked_up')::int AS redeem_count,
          COUNT(*) FILTER (WHERE status = 'pawned_expired')::int AS expire_count,
          COUNT(*) FILTER (
            WHERE status IN ('sold', 'sold_expired') OR location = 'BIWK'
          )::int AS sell_count
        FROM ticket
        WHERE client_number IS NOT NULL
        GROUP BY client_number
      ),
      computed AS (
        SELECT
          c.client_number,
          c.redeem_count AS old_redeem_count,
          c.expire_count AS old_expire_count,
          c.sell_count AS old_sell_count,
          COALESCE(s.redeem_count, 0) AS new_redeem_count,
          COALESCE(s.expire_count, 0) AS new_expire_count,
          COALESCE(s.sell_count, 0) AS new_sell_count
        FROM client c
        LEFT JOIN stats s
          ON s.client_number = c.client_number
      )
      SELECT COUNT(*)::int AS count
      FROM computed
      WHERE old_redeem_count <> new_redeem_count
         OR old_expire_count <> new_expire_count
         OR old_sell_count <> new_sell_count
    `);

    const largestChanges = await client.query(`
      WITH stats AS (
        SELECT
          client_number,
          COUNT(*) FILTER (WHERE status = 'pawned_picked_up')::int AS redeem_count,
          COUNT(*) FILTER (WHERE status = 'pawned_expired')::int AS expire_count,
          COUNT(*) FILTER (
            WHERE status IN ('sold', 'sold_expired') OR location = 'BIWK'
          )::int AS sell_count
        FROM ticket
        WHERE client_number IS NOT NULL
        GROUP BY client_number
      ),
      computed AS (
        SELECT
          c.client_number,
          c.last_name,
          c.first_name,
          c.redeem_count AS old_redeem_count,
          c.expire_count AS old_expire_count,
          c.sell_count AS old_sell_count,
          COALESCE(s.redeem_count, 0) AS new_redeem_count,
          COALESCE(s.expire_count, 0) AS new_expire_count,
          COALESCE(s.sell_count, 0) AS new_sell_count
        FROM client c
        LEFT JOIN stats s
          ON s.client_number = c.client_number
      )
      SELECT
        client_number,
        last_name,
        first_name,
        old_redeem_count,
        new_redeem_count,
        old_expire_count,
        new_expire_count,
        old_sell_count,
        new_sell_count,
        (
          ABS(old_redeem_count - new_redeem_count) +
          ABS(old_expire_count - new_expire_count) +
          ABS(old_sell_count - new_sell_count)
        )::int AS total_delta
      FROM computed
      WHERE old_redeem_count <> new_redeem_count
         OR old_expire_count <> new_expire_count
         OR old_sell_count <> new_sell_count
      ORDER BY total_delta DESC, client_number ASC
      LIMIT 20
    `);

    if (shouldCommit) {
      await client.query(`
        WITH stats AS (
          SELECT
            client_number,
            COUNT(*) FILTER (WHERE status = 'pawned_picked_up')::int AS redeem_count,
            COUNT(*) FILTER (WHERE status = 'pawned_expired')::int AS expire_count,
            COUNT(*) FILTER (
              WHERE status IN ('sold', 'sold_expired') OR location = 'BIWK'
            )::int AS sell_count
          FROM ticket
          WHERE client_number IS NOT NULL
          GROUP BY client_number
        )
        UPDATE client c
        SET
          redeem_count = COALESCE(s.redeem_count, 0),
          expire_count = COALESCE(s.expire_count, 0),
          sell_count = COALESCE(s.sell_count, 0),
          updated_at = CURRENT_TIMESTAMP
        FROM client target
        LEFT JOIN stats s
          ON s.client_number = target.client_number
        WHERE c.client_number = target.client_number
      `);
    }

    const afterTotals = shouldCommit
      ? await client.query(`
          SELECT
            COALESCE(SUM(redeem_count), 0)::int AS redeem_total,
            COALESCE(SUM(expire_count), 0)::int AS expire_total,
            COALESCE(SUM(sell_count), 0)::int AS sell_total
          FROM client
        `)
      : { rows: beforeTotals.rows };

    if (shouldCommit) {
      await client.query("COMMIT");
    } else {
      await client.query("ROLLBACK");
    }

    const before = beforeTotals.rows[0];
    const recomputed = recomputedTotals.rows[0];
    const after = afterTotals.rows[0];
    const changed = changedClients.rows[0].count;

    const sampleRows = largestChanges.rows.map((row) => {
      const name = [row.last_name, row.first_name].filter(Boolean).join(", ");
      return [
        row.client_number,
        name || "<blank>",
        `${row.old_redeem_count} -> ${row.new_redeem_count}`,
        `${row.old_expire_count} -> ${row.new_expire_count}`,
        `${row.old_sell_count} -> ${row.new_sell_count}`,
        row.total_delta,
      ];
    });

    const sampleTable = sampleRows.length
      ? [
          "| client_number | client_name | redeem | expire | sold | total_delta |",
          "| ---: | --- | ---: | ---: | ---: | ---: |",
          ...sampleRows.map((row) => `| ${row.join(" | ")} |`),
        ].join("\n")
      : "_none_";

    const statusCountRows = await pool.query(`
      SELECT status AS label, COUNT(*)::int AS count
      FROM ticket
      GROUP BY status
      ORDER BY count DESC, status ASC
    `);

    const section = [
      "## Client Statistics Recalculation",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      `Mode: ${shouldCommit ? "commit" : "preview"}`,
      "",
      "Rules:",
      "",
      "- `redeem_count`: count tickets with status `pawned_picked_up`.",
      "- `expire_count`: count tickets with status `pawned_expired` only.",
      "- `sell_count`: count tickets with status `sold` or `sold_expired`, plus any ticket whose location is `BIWK`.",
      "- `partial_payment` and other ticket amounts do not affect these statistics.",
      "",
      "Summary:",
      "",
      "```txt",
      `Clients with changed statistics: ${changed}`,
      `Clients with ticket-derived stats: ${recomputed.clients_with_ticket_stats}`,
      `Before redeem total: ${before.redeem_total}`,
      `Before expire total: ${before.expire_total}`,
      `Before sold total: ${before.sell_total}`,
      `Recomputed redeem total: ${recomputed.redeem_total}`,
      `Recomputed expire total: ${recomputed.expire_total}`,
      `Recomputed sold total: ${recomputed.sell_total}`,
      `After redeem total: ${after.redeem_total}`,
      `After expire total: ${after.expire_total}`,
      `After sold total: ${after.sell_total}`,
      "```",
      "",
      "Ticket status counts used:",
      "",
      formatCountRows(statusCountRows.rows),
      "",
      "Largest changed clients:",
      "",
      sampleTable,
    ].join("\n");

    const existingReport = fs.existsSync(reportPath)
      ? fs.readFileSync(reportPath, "utf8")
      : "# Client Migration\n";
    fs.writeFileSync(
      reportPath,
      replaceReportSection(existingReport, "Client Statistics Recalculation", section),
    );

    console.log(`Client statistics ${shouldCommit ? "committed" : "previewed"}`);
    console.log(`Changed clients: ${changed.toLocaleString()}`);
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
