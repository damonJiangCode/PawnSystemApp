#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const csv = require("csv-parser");
const { Pool } = require("pg");

const migrationRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(migrationRoot, "..");
const sourceDbPath = path.join(migrationRoot, "source", "superpawnconv.mdb");
const summaryDir = path.join(migrationRoot, "reports");
const reportPath = path.join(summaryDir, "city-migration.md");

const dbConfig = {
  user: process.env.DB_USER || "moneyexpress",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "pawnsystemdb_migration",
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
};

const normalizeText = (value) => String(value ?? "").trim();
const normalizeUpper = (value) => normalizeText(value).toUpperCase();
const normalizeCityKeyPart = (value) =>
  normalizeUpper(value)
    .replace(/\./g, "")
    .replace(/\s+/g, " ");

const cityKey = (city, province, country) =>
  `${normalizeCityKeyPart(city)}|${normalizeCityKeyPart(province)}|${normalizeCityKeyPart(country)}`;

const baseCityName = (city) =>
  normalizeCityKeyPart(city).replace(/\s+NO\s+\d+$/, "");

const normalizeMigrationLocation = (city, province, country) => {
  const resolvedCountry = country || "Canada";
  if (normalizeCityKeyPart(resolvedCountry) !== "CANADA") {
    return { city: "Other", province: "Other", country: "Other" };
  }

  return { city, province, country: "Canada" };
};

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

const readAccessTable = (tableName) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    const child = spawn("mdb-export", ["-b", "strip", sourceDbPath, tableName], {
      cwd: projectRoot,
    });

    child.stdout.pipe(csv()).on("data", (row) => rows.push(row));

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`mdb-export ${tableName} failed: ${stderr}`));
        return;
      }

      resolve(rows);
    });
  });
};

const buildLookupByCode = (rows, codeKey, valueBuilder) => {
  const lookup = new Map();
  for (const row of rows) {
    const code = normalizeText(getValue(row, codeKey));
    if (code) {
      lookup.set(code, valueBuilder(row));
    }
  }
  return lookup;
};

const addSample = (map, key, value, limit = 5) => {
  const values = map.get(key) || [];
  if (values.length < limit) {
    values.push(value);
  }
  map.set(key, values);
};

const formatTable = (headers, rows) => {
  if (!rows.length) {
    return "_none_";
  }

  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
};

const loadLegacyClientCities = async () => {
  const [clientRows, cityRows, provinceRows, countryRows] = await Promise.all([
    readAccessTable("AR200CLIENT"),
    readAccessTable("MF100CITY"),
    readAccessTable("MF110PROVINCE"),
    readAccessTable("MF120COUNTRY"),
  ]);

  const countryByCode = buildLookupByCode(countryRows, "MF120CODE", (row) =>
    normalizeText(getValue(row, "MF120COUNTRY")),
  );
  const provinceByCode = buildLookupByCode(provinceRows, "MF110CODE", (row) => ({
    province: normalizeText(getValue(row, "MF110PROVINCE")),
    countryCode: normalizeText(getValue(row, "MF110COUNTRYCODE")),
  }));
  const cityByCode = buildLookupByCode(cityRows, "MF100CITY", (row) => {
    const provinceCode = normalizeText(getValue(row, "MF100PROVINCENO"));
    const province = provinceByCode.get(provinceCode);
    const countryCode =
      province?.countryCode || normalizeText(getValue(row, "MF110COUNTRYCODE"));

    return {
      city: normalizeText(getValue(row, "MF100NAME")),
      province: province?.province || normalizeText(getValue(row, "MF100PROVSHNAME")),
      country: countryByCode.get(countryCode) || "",
    };
  });

  const usedCities = new Map();
  const samplesByKey = new Map();

  for (const row of clientRows) {
    const clientNumber = normalizeText(getValue(row, "AR200CLIENT"));
    const firstName = normalizeText(getValue(row, "AR200FIRSTNAME"));
    const lastName = normalizeText(getValue(row, "AR200LASTNAME"));
    const cityCode = normalizeText(getValue(row, "AR200CITYNO"));
    const provinceCode = normalizeText(getValue(row, "AR200PROVINCENO"));
    const cityInfo = cityByCode.get(cityCode);
    const provinceInfo = provinceByCode.get(provinceCode);
    const rawCity = normalizeText(getValue(row, "AR200CITY"));
    const rawProvince = normalizeText(getValue(row, "AR200PROVINCE"));
    const rawCountryCode = normalizeText(getValue(row, "AR200COUNTRY"));
    const location = normalizeMigrationLocation(
      cityInfo?.city || rawCity,
      cityInfo?.province || provinceInfo?.province || rawProvince,
      cityInfo?.country || countryByCode.get(rawCountryCode) || "Canada",
    );
    const { city, province, country } = location;

    if (!city || !province || !country) {
      continue;
    }

    const key = cityKey(city, province, country);
    const current = usedCities.get(key) || { city, province, country, count: 0 };
    current.count += 1;
    usedCities.set(key, current);
    addSample(
      samplesByKey,
      key,
      `${clientNumber}: ${lastName || "<blank>"}, ${firstName || "<blank>"}`,
    );
  }

  return { clientRows, usedCities, samplesByKey };
};

const main = async () => {
  fs.mkdirSync(summaryDir, { recursive: true });
  if (!process.env.DB_PASSWORD) {
    throw new Error("Set DB_PASSWORD in private environment configuration.");
  }

  const pool = new Pool(dbConfig);

  try {
    const { clientRows, usedCities, samplesByKey } = await loadLegacyClientCities();

    await pool.query("BEGIN");

    const beforeResult = await pool.query(
      "SELECT id, city, province, country FROM city ORDER BY province, city",
    );

    const beforeKeys = new Set(
      beforeResult.rows.map((row) => cityKey(row.city, row.province, row.country)),
    );
    const usedKeys = new Set(usedCities.keys());
    const missingRows = [...usedCities.entries()]
      .filter(([key]) => !beforeKeys.has(key))
      .map(([, value]) => value)
      .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));

    if (missingRows.length) {
      await pool.query(
        `
          INSERT INTO city (city, province, country)
          SELECT seed.city, seed.province, seed.country
          FROM UNNEST($1::text[], $2::text[], $3::text[]) AS seed(city, province, country)
          ON CONFLICT (city, province, country) DO NOTHING
        `,
        [
          missingRows.map((row) => row.city),
          missingRows.map((row) => row.province),
          missingRows.map((row) => row.country),
        ],
      );
    }

    const afterInsertResult = await pool.query(
      "SELECT id, city, province, country FROM city ORDER BY province, city",
    );

    const deleteCandidates = [];
    const legacyRows = [...usedCities.values()];
    for (const target of afterInsertResult.rows) {
      const targetKey = cityKey(target.city, target.province, target.country);
      if (usedKeys.has(targetKey)) {
        continue;
      }

      const targetProvince = normalizeCityKeyPart(target.province);
      const targetCountry = normalizeCityKeyPart(target.country);
      const targetBase = baseCityName(target.city);
      const matchingLegacy = legacyRows.find(
        (legacy) =>
          normalizeCityKeyPart(legacy.province) === targetProvince &&
          normalizeCityKeyPart(legacy.country) === targetCountry &&
          baseCityName(legacy.city) === targetBase,
      );

      if (matchingLegacy) {
        deleteCandidates.push({
          ...target,
          legacyCity: matchingLegacy.city,
          legacyCount: matchingLegacy.count,
        });
      }
    }

    if (deleteCandidates.length) {
      await pool.query(
        "DELETE FROM city WHERE id = ANY($1::int[])",
        [deleteCandidates.map((row) => row.id)],
      );
    }

    const afterCleanupResult = await pool.query(
      "SELECT id, city, province, country FROM city ORDER BY province, city",
    );

    const finalKeys = new Set(
      afterCleanupResult.rows.map((row) => cityKey(row.city, row.province, row.country)),
    );
    const stillMissingRows = [...usedCities.entries()]
      .filter(([key]) => !finalKeys.has(key))
      .map(([, value]) => value)
      .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));

    await pool.query("COMMIT");

    const insertedClientUseCount = missingRows.reduce(
      (total, row) => total + row.count,
      0,
    );
    const deletedTableRows = deleteCandidates
      .sort((a, b) => a.province.localeCompare(b.province) || a.city.localeCompare(b.city))
      .map((row) => [
        row.city,
        row.province,
        row.country,
        row.legacyCity,
        String(row.legacyCount),
      ]);
    const topInsertedRows = missingRows.slice(0, 120).map((row) => [
      String(row.count),
      row.city,
      row.province,
      row.country,
      (samplesByKey.get(cityKey(row.city, row.province, row.country)) || []).join("<br>"),
    ]);

    const report = [
      "# Client City Migration",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "Scope: migrate city/province/country values actually used by legacy `AR200CLIENT` into the migration database `city` table, then remove current city rows that overlap those legacy cities but are not legacy-used.",
      "",
      "Target database:",
      "",
      "```txt",
      `${dbConfig.host}:${dbConfig.port}/${dbConfig.database} as ${dbConfig.user}`,
      "```",
      "",
      "## Summary",
      "",
      "```txt",
      `Legacy client rows: ${clientRows.length}`,
      `Distinct legacy-used city combos: ${usedCities.size}`,
      `City rows before migration: ${beforeResult.rows.length}`,
      `Legacy-used combos inserted: ${missingRows.length}`,
      `Legacy client rows covered by inserted combos: ${insertedClientUseCount}`,
      `Overlapping unused current city rows deleted: ${deleteCandidates.length}`,
      `City rows after cleanup: ${afterCleanupResult.rows.length}`,
      `Legacy-used combos still missing: ${stillMissingRows.length}`,
      "```",
      "",
      "## Deleted Overlapping Unused Current Rows",
      "",
      formatTable(
        ["deleted_city", "province", "country", "kept_legacy_city", "legacy_use_count"],
        deletedTableRows,
      ),
      "",
      "## Inserted Legacy-Used City Combos",
      "",
      formatTable(
        ["use_count", "city", "province", "country", "example_clients"],
        topInsertedRows,
      ),
      missingRows.length > 120 ? `\n\n... ${missingRows.length - 120} more inserted rows` : "",
      "",
      "## Still Missing",
      "",
      stillMissingRows.length
        ? formatTable(
            ["use_count", "city", "province", "country"],
            stillMissingRows.map((row) => [
              String(row.count),
              row.city,
              row.province,
              row.country,
            ]),
          )
        : "_none_",
      "",
    ].join("\n");

    fs.writeFileSync(reportPath, report);
    console.log(`Client city migration written to ${reportPath}`);
  } catch (error) {
    try {
      await pool.query("ROLLBACK");
    } catch {
      // Ignore rollback errors so the original failure remains visible.
    }
    throw error;
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
