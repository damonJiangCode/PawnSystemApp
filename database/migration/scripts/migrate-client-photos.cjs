#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const csv = require("csv-parser");
const { Pool } = require("pg");

const migrationRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(migrationRoot, "..", "..");
const sourceDbPath = path.join(migrationRoot, "source", "superpawnconv.mdb");
const outputDir = path.join(migrationRoot, "exports", "client-photos");
const summaryDir = process.env.MIGRATION_REPORT_DIR || path.join(migrationRoot, "reports");
const reportPath = path.join(summaryDir, "client-migration.md");
const shouldUpdateDb = process.argv.includes("--update-db");

const dbConfig = {
  user: process.env.DB_USER || "moneyexpress",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "pawnsystemdb_migration",
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
};

const normalizeText = (value) => String(value ?? "").trim();

const getValue = (row, key) => {
  if (Object.prototype.hasOwnProperty.call(row, key)) {
    return row[key];
  }

  const lowerKey = key.toLowerCase();
  const actualKey = Object.keys(row).find(
    (candidate) => candidate.toLowerCase() === lowerKey,
  );

  return actualKey ? row[actualKey] : undefined;
};

const sanitizeFilePart = (value) => {
  const normalized = normalizeText(value) || "null";
  return normalized
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "null";
};

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

const getNextGeneratedClientNumber = () =>
  new Promise((resolve, reject) => {
    const sourceClientNumbers = [];
    const child = spawn("mdb-export", ["-b", "strip", sourceDbPath, "AR200CLIENT"], {
      cwd: projectRoot,
    });

    child.stdout.pipe(csv()).on("data", (row) => {
      const clientNumber = Number(normalizeText(getValue(row, "AR200CLIENT")));
      if (Number.isFinite(clientNumber)) {
        sourceClientNumbers.push(clientNumber);
      }
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`mdb-export AR200CLIENT failed: ${stderr}`));
        return;
      }

      resolve(Math.max(0, ...sourceClientNumbers) + 1);
    });
  });

const exportRows = (initialGeneratedClientNumber) =>
  new Promise((resolve, reject) => {
    const exported = [];
    const duplicateClientNumbers = [];
    const sourceClientNumbers = new Set();
    let nextGeneratedClientNumber = initialGeneratedClientNumber;
    let totalRows = 0;
    let withPhoto = 0;
    let withoutPhoto = 0;
    let jpgCount = 0;
    let nonJpgCount = 0;
    let totalBytes = 0;
    const samples = [];

    const child = spawn("mdb-export", ["-b", "octal", sourceDbPath, "AR200CLIENT"], {
      cwd: projectRoot,
    });

    child.stdout.pipe(csv()).on("data", (row) => {
      totalRows += 1;
      const sourceClientNumber = normalizeText(getValue(row, "AR200CLIENT"));
      let clientNumber = sourceClientNumber;

      if (sourceClientNumber && sourceClientNumbers.has(sourceClientNumber)) {
        clientNumber = String(nextGeneratedClientNumber);
        nextGeneratedClientNumber += 1;
        duplicateClientNumbers.push(`${sourceClientNumber} -> ${clientNumber}`);
      } else if (sourceClientNumber) {
        sourceClientNumbers.add(sourceClientNumber);
      }

      const picture = normalizeText(getValue(row, "AR200CLIENTPIC"));
      if (!picture) {
        withoutPhoto += 1;
        return;
      }

      const buffer = decodeMdbOctalBytes(picture);
      const extension = imageExtension(buffer);
      const firstName = sanitizeFilePart(getValue(row, "AR200FIRSTNAME"));
      const baseName = `${sanitizeFilePart(clientNumber)}_${firstName}.${extension}`;
      const filePath = ensureUniquePath(path.join(outputDir, baseName));
      fs.writeFileSync(filePath, buffer);

      withPhoto += 1;
      totalBytes += buffer.length;
      if (extension === "jpg") {
        jpgCount += 1;
      } else {
        nonJpgCount += 1;
      }

      const relativePath = path.relative(projectRoot, filePath);
      exported.push({
        clientNumber,
        filePath,
        relativePath,
        bytes: buffer.length,
        extension,
      });

      if (samples.length < 10) {
        samples.push(`${clientNumber}: ${relativePath}`);
      }
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`mdb-export AR200CLIENT failed: ${stderr}`));
        return;
      }

      resolve({
        totalRows,
        withPhoto,
        withoutPhoto,
        jpgCount,
        nonJpgCount,
        totalBytes,
        duplicateClientNumbers,
        exported,
        samples,
      });
    });
  });

const updateDbImagePaths = async (exported) => {
  if (!process.env.DB_PASSWORD) {
    throw new Error("Set DB_PASSWORD in private environment configuration.");
  }

  const pool = new Pool(dbConfig);
  try {
    await pool.query("BEGIN");
    for (const row of exported) {
      await pool.query(
        "UPDATE client SET image_path = $1 WHERE client_number = $2",
        [row.relativePath, row.clientNumber],
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

const main = async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(summaryDir, { recursive: true });

  const initialGeneratedClientNumber = await getNextGeneratedClientNumber();
  const result = await exportRows(initialGeneratedClientNumber);
  if (shouldUpdateDb) {
    await updateDbImagePaths(result.exported);
  }

  const photoSection = [
    "## Client Photo Export",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Source: `AR200CLIENT.AR200CLIENTPIC` from `superpawnconv.mdb`.",
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
    "clientnumber_firstname.jpg",
    "```",
    "",
    "## Summary",
    "",
    "```txt",
    `Legacy client rows: ${result.totalRows}`,
    `Photos exported: ${result.withPhoto}`,
    `Clients without photo: ${result.withoutPhoto}`,
    `JPEG files: ${result.jpgCount}`,
    `Non-JPEG files: ${result.nonJpgCount}`,
    `Total exported bytes: ${result.totalBytes}`,
    `Updated DB image_path: ${shouldUpdateDb ? "yes" : "no"}`,
    "```",
    "",
    "## Duplicate Client Number Reassignments Used",
    "",
    formatList(result.duplicateClientNumbers, 40),
    "",
    "## Samples",
    "",
    formatList(result.samples, 20),
    "",
  ].join("\n");

  const existingReport = fs.existsSync(reportPath)
    ? fs.readFileSync(reportPath, "utf8")
    : "# Client Migration\n";
  fs.writeFileSync(
    reportPath,
    replaceReportSection(existingReport, "Client Photo Export", photoSection),
  );
  console.log(`Client photo export section written to ${reportPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
