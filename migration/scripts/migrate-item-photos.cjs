#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const csv = require("csv-parser");
const { Pool } = require("pg");

const migrationRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(migrationRoot, "..");
const sourceDbPath = path.join(migrationRoot, "source", "Pictureconv.mdb");
const outputDir = path.join(migrationRoot, "exports", "item-photos");
const summaryDir = process.env.MIGRATION_REPORT_DIR || path.join(migrationRoot, "reports");
const reportPath = path.join(summaryDir, "item-migration.md");
const shouldUpdateDb = process.argv.includes("--update-db");

const dbConfig = {
  user: process.env.DB_USER || "moneyexpress",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "pawnsystemdb_migration",
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
};

const normalizeText = (value) => String(value ?? "").trim();

const decodeMdbOctalBytes = (value) => {
  const bytes = [];
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "\\" && /^[0-7]{3}$/.test(value.slice(index + 1, index + 4))) {
      bytes.push(Number.parseInt(value.slice(index + 1, index + 4), 8));
      index += 3;
      continue;
    }

    bytes.push(char.charCodeAt(0));
  }

  return Buffer.from(bytes);
};

const imageExtension = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46
  ) {
    return "gif";
  }

  return "bin";
};

const ensureUniquePath = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return filePath;
  }

  const parsed = path.parse(filePath);
  for (let index = 2; ; index += 1) {
    const candidate = path.join(parsed.dir, `${parsed.name}_${index}${parsed.ext}`);
    if (!fs.existsSync(candidate)) {
      return candidate;
    }
  }
};

const formatList = (items, limit = 30) => {
  if (!items.length) {
    return "_none_";
  }

  const visible = items.slice(0, limit).map((item) => `- ${item}`);
  if (items.length > limit) {
    visible.push(`- ... ${items.length - limit} more`);
  }
  return visible.join("\n");
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

const loadTargetItems = async () => {
  if (!process.env.DB_PASSWORD) {
    throw new Error("Set DB_PASSWORD in private environment configuration.");
  }

  const pool = new Pool(dbConfig);
  try {
    const result = await pool.query("SELECT item_number FROM item");
    return new Set(result.rows.map((row) => String(row.item_number)));
  } finally {
    await pool.end();
  }
};

const exportRows = async () =>
  new Promise(async (resolve, reject) => {
    const targetItems = await loadTargetItems();
    const exported = [];
    const missingTargetItems = [];
    let totalRows = 0;
    let withPhoto = 0;
    let withoutPhoto = 0;
    let jpgCount = 0;
    let nonJpgCount = 0;
    let totalBytes = 0;
    const samples = [];

    const child = spawn("mdb-export", ["-b", "octal", sourceDbPath, "WC405ITEMPIC"], {
      cwd: projectRoot,
    });

    child.stdout.pipe(csv()).on("data", (row) => {
      totalRows += 1;
      const itemNumber = normalizeText(row.WC405ITEMNO);
      const picture = normalizeText(row.WC405ITEMPICTURE);

      if (!picture) {
        withoutPhoto += 1;
        return;
      }

      withPhoto += 1;
      if (!targetItems.has(itemNumber)) {
        if (missingTargetItems.length < 100) {
          missingTargetItems.push(itemNumber);
        }
        return;
      }

      const buffer = decodeMdbOctalBytes(picture);
      const extension = imageExtension(buffer);
      const filePath = ensureUniquePath(path.join(outputDir, `${itemNumber}.${extension}`));
      fs.writeFileSync(filePath, buffer);

      totalBytes += buffer.length;
      if (extension === "jpg") {
        jpgCount += 1;
      } else {
        nonJpgCount += 1;
      }

      const relativePath = path.relative(projectRoot, filePath);
      exported.push({
        itemNumber,
        filePath,
        relativePath,
        bytes: buffer.length,
        extension,
      });

      if (samples.length < 10) {
        samples.push(`${itemNumber}: ${relativePath}`);
      }
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`mdb-export WC405ITEMPIC failed: ${stderr}`));
        return;
      }

      resolve({
        totalRows,
        withPhoto,
        withoutPhoto,
        exported,
        jpgCount,
        nonJpgCount,
        totalBytes,
        missingTargetItems,
        samples,
      });
    });
  });

const updateDbImagePaths = async (exported) => {
  const pool = new Pool(dbConfig);
  try {
    await pool.query("BEGIN");
    for (const row of exported) {
      await pool.query(
        "UPDATE item SET image_path = $1 WHERE item_number = $2",
        [row.relativePath, row.itemNumber],
      );
    }
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally {
    await pool.end();
  }
};

const main = async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(summaryDir, { recursive: true });

  const result = await exportRows();
  if (shouldUpdateDb) {
    await updateDbImagePaths(result.exported);
  }

  const photoSection = [
    "## Item Photo Export",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Source: `WC405ITEMPIC.WC405ITEMPICTURE` from `Pictureconv.mdb`.",
    "",
    "Output directory:",
    "",
    "```txt",
    outputDir,
    "```",
    "",
    "Naming rule:",
    "",
    "```txt",
    "itemnumber.jpg",
    "```",
    "",
    "## Summary",
    "",
    "```txt",
    `Legacy item photo rows: ${result.totalRows}`,
    `Rows with photo: ${result.withPhoto}`,
    `Rows without photo: ${result.withoutPhoto}`,
    `Photos exported for migrated items: ${result.exported.length}`,
    `Photo rows without migrated item: ${result.withPhoto - result.exported.length}`,
    `JPEG files: ${result.jpgCount}`,
    `Non-JPEG files: ${result.nonJpgCount}`,
    `Total exported bytes: ${result.totalBytes}`,
    `Updated DB image_path: ${shouldUpdateDb ? "yes" : "no"}`,
    "```",
    "",
    "## Missing Migrated Item Samples",
    "",
    formatList(result.missingTargetItems, 30),
    "",
    "## Samples",
    "",
    formatList(result.samples, 20),
    "",
  ].join("\n");

  const existingReport = fs.existsSync(reportPath)
    ? fs.readFileSync(reportPath, "utf8")
    : "# Item Migration\n";
  fs.writeFileSync(
    reportPath,
    replaceReportSection(existingReport, "Item Photo Export", photoSection),
  );
  console.log(`Item photo export section written to ${reportPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
