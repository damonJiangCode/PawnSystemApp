#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const csv = require("csv-parser");
const { Pool } = require("pg");

const migrationRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(migrationRoot, "..", "..");
const sourceDbPath = path.join(migrationRoot, "source", "superpawnconv.mdb");
const summaryDir = process.env.MIGRATION_REPORT_DIR || path.join(migrationRoot, "reports");
const reportPath = path.join(summaryDir, "static-migration.md");

const dbConfig = {
  user: process.env.DB_USER || "moneyexpress",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "pawnsystemdb_migration",
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
};

const normalizeText = (value) => String(value ?? "").trim();
const normalizeUpper = (value) => normalizeText(value).toUpperCase();
const HAIR_COLOR_MAPPING = {
  UNKNOWN: "OTHER",
  AUBURN: "OTHER",
  DYED: "OTHER",
  GRAYING: "GRAY",
  SANDY: "OTHER",
  "DARK BROWN": "BROWN",
  "LIGHT BROWN": "BROWN",
  "DARK BLONDE": "BLONDE",
  "LIGHT BLONDE": "BLONDE",
};
const EYE_COLOR_MAPPING = {
  GREY: "GRAY",
  "DARK BROWN": "BROWN",
  "LIGHT BROWN": "BROWN",
};
const ID_TYPE_MAPPING = {
  SIN: "Social Insurance Number",
  DRL: "Driver's License",
  MAN: "Driver's License",
  ONT: "Driver's License",
  BRI: "Driver's License",
  NTD: "Driver's License",
  NSD: "Driver's License",
  HCD: "Health Card",
  AHC: "Health Card",
  TRD: "Indian Status Card",
  FAC: "Firearms License",
  BCD: "Birth Certificate",
  PAS: "Canadian Passport",
  CIT: "Citizenship Card",
  SAI: "Provincial ID",
  BCI: "Provincial ID",
  ALI: "Provincial ID",
  ALT: "Provincial ID",
  OTH: "Other",
  REM: "Other",
  BAR: "Other",
  "M/M": "Other",
  CAS: "Other",
  ROY: "Other",
  CRE: "Other",
  LIB: "Other",
  CIB: "Other",
};
const mapHairColor = (value) => {
  const normalized = normalizeUpper(value);
  return HAIR_COLOR_MAPPING[normalized] || normalized;
};
const mapEyeColor = (value) => {
  const normalized = normalizeUpper(value);
  return EYE_COLOR_MAPPING[normalized] || normalized;
};
const mapIdType = (code) => {
  const normalized = normalizeUpper(code);
  return ID_TYPE_MAPPING[normalized] || "";
};
const getValue = (row, key) => {
  if (Object.prototype.hasOwnProperty.call(row, key)) {
    return row[key];
  }

  const lowerKey = key.toLowerCase();
  const actualKey = Object.keys(row).find((candidate) => {
    return candidate.toLowerCase() === lowerKey;
  });

  return actualKey ? row[actualKey] : undefined;
};

const uniq = (values) => [...new Set(values)];

const sample = (values, limit = 20) => values.slice(0, limit);

const formatList = (values, limit = 20) => {
  if (!values.length) {
    return "_none_";
  }

  const visible = sample(values, limit)
    .map((value) => `- ${value}`)
    .join("\n");
  const extra = values.length > limit ? `\n- ... ${values.length - limit} more` : "";
  return `${visible}${extra}`;
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

const getTargetValues = async (pool, sql) => {
  const result = await pool.query(sql);
  return result.rows;
};

const compareSets = (sourceValues, targetValues) => {
  const source = uniq(sourceValues.filter(Boolean));
  const target = new Set(targetValues.filter(Boolean));
  const existing = source.filter((value) => target.has(value));
  const wouldInsert = source.filter((value) => !target.has(value));

  return {
    sourceCount: source.length,
    targetCount: target.size,
    existing,
    wouldInsert,
  };
};

const section = (title, body) => `## ${title}\n\n${body.trim()}\n\n`;

const summarizeSimpleSet = ({ label, sourceRows, targetRows, sourceValues }) => {
  const comparison = compareSets(sourceValues, targetRows.map((row) => row.value));
  return section(
    label,
    [
      `Source rows: ${sourceRows.length}`,
      `Unique source values after normalization: ${comparison.sourceCount}`,
      `Existing target values: ${comparison.targetCount}`,
      `Already present: ${comparison.existing.length}`,
      `Would insert: ${comparison.wouldInsert.length}`,
      "",
      "Would insert sample:",
      formatList(comparison.wouldInsert),
    ].join("\n"),
  );
};

const main = async () => {
  fs.mkdirSync(summaryDir, { recursive: true });

  if (!process.env.DB_PASSWORD) {
    throw new Error("Set DB_PASSWORD in private environment configuration.");
  }

  const pool = new Pool(dbConfig);

  try {
    const [
      idRows,
      hairRows,
      eyeRows,
      locationRows,
      categoryRows,
      subcategoryRows,
      cityRows,
      provinceRows,
      countryRows,
      employeeRows,
    ] = await Promise.all([
      readAccessTable("AR400ID"),
      readAccessTable("BW010HAIRCODE"),
      readAccessTable("BW015EYECODE"),
      readAccessTable("WC450LOCATION"),
      readAccessTable("WC510CATEGORY"),
      readAccessTable("WC520SUBCAT"),
      readAccessTable("MF100CITY"),
      readAccessTable("MF110PROVINCE"),
      readAccessTable("MF120COUNTRY"),
      readAccessTable("EM200EMPLOYEE"),
    ]);

    const [
      targetIdTypes,
      targetHairColors,
      targetEyeColors,
      targetLocations,
      targetCategories,
      targetSubcategories,
      targetCities,
      targetEmployees,
    ] = await Promise.all([
      getTargetValues(pool, "SELECT type AS value FROM id_type ORDER BY type"),
      getTargetValues(pool, "SELECT color AS value FROM hair_color ORDER BY color"),
      getTargetValues(pool, "SELECT color AS value FROM eye_color ORDER BY color"),
      getTargetValues(pool, "SELECT location AS value FROM location ORDER BY location"),
      getTargetValues(pool, "SELECT name AS value FROM item_category ORDER BY name"),
      getTargetValues(
        pool,
        `
          SELECT category.name || ' / ' || subcategory.name AS value
          FROM item_subcategory subcategory
          JOIN item_category category ON category.id = subcategory.category_id
          ORDER BY category.name, subcategory.name
        `,
      ),
      getTargetValues(
        pool,
        "SELECT city || ' / ' || province || ' / ' || country AS value FROM city ORDER BY city, province, country",
      ),
      getTargetValues(pool, "SELECT employee_number::text AS value FROM employee ORDER BY employee_number"),
    ]);

    const provinceByCode = new Map(
      provinceRows.map((row) => [
        normalizeText(getValue(row, "MF110CODE")),
        {
          province: normalizeText(getValue(row, "MF110PROVINCE")),
          countryCode: normalizeText(getValue(row, "MF110COUNTRYCODE")),
        },
      ]),
    );
    const countryByCode = new Map(
      countryRows.map((row) => [
        normalizeText(getValue(row, "MF120CODE")),
        normalizeText(getValue(row, "MF120COUNTRY")),
      ]),
    );
    const categoryByCode = new Map(
      categoryRows.map((row) => [
        normalizeText(getValue(row, "WC510CODE")),
        normalizeUpper(getValue(row, "WC510DESCRIPTION")),
      ]),
    );

    const rawIdTypes = idRows.map((row) => ({
      code: normalizeUpper(getValue(row, "AR400IDCODE")),
      description: normalizeText(getValue(row, "AR400IDDESCRIPTION")),
    }));
    const idTypes = rawIdTypes.map((row) => mapIdType(row.code));
    const idNeedsReview = idRows
      .map((row) => {
        return `${normalizeText(getValue(row, "AR400IDCODE"))} -> ${normalizeText(
          getValue(row, "AR400IDDESCRIPTION"),
        )}`;
      })
      .filter((value) => value !== "->");

    const rawHairColors = hairRows.map((row) => normalizeUpper(getValue(row, "BW010HAIRCODE")));
    const rawEyeColors = eyeRows.map((row) => normalizeUpper(getValue(row, "BW015EYECODE")));
    const hairColors = rawHairColors.map(mapHairColor);
    const eyeColors = rawEyeColors.map(mapEyeColor);
    const locations = locationRows.map((row) => normalizeUpper(getValue(row, "WC450CODE")));
    const categories = categoryRows.map((row) => normalizeUpper(getValue(row, "WC510DESCRIPTION")));
    const subcategories = subcategoryRows.map((row) => {
      const category =
        categoryByCode.get(normalizeText(getValue(row, "WC520CATEGORYCODE"))) ||
        "<UNKNOWN CATEGORY>";
      return `${category} / ${normalizeText(getValue(row, "WC520DESC")).toLowerCase()}`;
    });
    const cities = cityRows.map((row) => {
      const provinceInfo = provinceByCode.get(normalizeText(getValue(row, "MF100PROVINCENO")));
      const province =
        provinceInfo?.province ||
        normalizeText(getValue(row, "MF100PROVSHNAME")) ||
        "<UNKNOWN PROVINCE>";
      const country =
        countryByCode.get(provinceInfo?.countryCode || normalizeText(getValue(row, "MF110COUNTRYCODE"))) ||
        "<UNKNOWN COUNTRY>";
      return `${normalizeText(getValue(row, "MF100NAME"))} / ${province} / ${country}`;
    });

    const employeeMissingPassword = employeeRows.filter((row) => {
      return !normalizeText(getValue(row, "EM200PASSWORD"));
    }).length;
    const employeeMissingBirthdate = employeeRows.filter((row) => {
      return !normalizeText(getValue(row, "EM200BIRTHDATE"));
    }).length;
    const employeeMissingNickname = employeeRows.filter((row) => {
      return !normalizeText(getValue(row, "EM200NICKNAME"));
    }).length;
    const employeeNumbers = employeeRows.map((row) => normalizeText(getValue(row, "EM200EMPLOYEEID")));
    const employeeComparison = compareSets(employeeNumbers, targetEmployees.map((row) => row.value));

    const sourceCounts = [
      ["AR400ID", idRows.length],
      ["BW010HAIRCODE", hairRows.length],
      ["BW015EYECODE", eyeRows.length],
      ["WC450LOCATION", locationRows.length],
      ["WC510CATEGORY", categoryRows.length],
      ["WC520SUBCAT", subcategoryRows.length],
      ["MF100CITY", cityRows.length],
      ["MF110PROVINCE", provinceRows.length],
      ["MF120COUNTRY", countryRows.length],
      ["EM200EMPLOYEE", employeeRows.length],
    ];

    const report = [
      "# Static Migration",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "No data was written to PostgreSQL.",
      "",
      "Target database:",
      "",
      "```txt",
      `${dbConfig.host}:${dbConfig.port}/${dbConfig.database} as ${dbConfig.user}`,
      "```",
      "",
      "## Source Counts",
      "",
      "```txt",
      ...sourceCounts.map(([name, count]) => `${name.padEnd(16)} ${count}`),
      "```",
      "",
      summarizeSimpleSet({
        label: "ID Types: AR400ID -> id_type",
        sourceRows: idRows,
        targetRows: targetIdTypes,
        sourceValues: idTypes,
      }),
      section(
        "ID Type Mapping Applied",
        [
          "Legacy ID descriptions are short labels. Approved mappings are applied before comparing to the target table.",
          "",
          formatList(
            rawIdTypes
              .map((row) => {
                const mapped = mapIdType(row.code);
                return mapped
                  ? `${row.code} (${row.description}) -> ${mapped}`
                  : `${row.code} (${row.description}) -> skip`;
              })
              .filter((value) => !value.startsWith("PHO ") && !value.startsWith(" ->")),
            40,
          ),
        ].join("\n"),
      ),
      summarizeSimpleSet({
        label: "Hair Colors: BW010HAIRCODE -> hair_color",
        sourceRows: hairRows,
        targetRows: targetHairColors,
        sourceValues: hairColors,
      }),
      section(
        "Hair Color Mapping Applied",
        formatList(
          uniq(
            rawHairColors
              .map((color) => `${color || "<blank>"} -> ${mapHairColor(color)}`)
              .filter((mapping) => {
                const [from, to] = mapping.split(" -> ");
                return from !== to;
              }),
          ),
          40,
        ),
      ),
      summarizeSimpleSet({
        label: "Eye Colors: BW015EYECODE -> eye_color",
        sourceRows: eyeRows,
        targetRows: targetEyeColors,
        sourceValues: eyeColors,
      }),
      section(
        "Eye Color Mapping Applied",
        formatList(
          uniq(
            rawEyeColors
              .map((color) => `${color || "<blank>"} -> ${mapEyeColor(color)}`)
              .filter((mapping) => {
                const [from, to] = mapping.split(" -> ");
                return from !== to;
              }),
          ),
          40,
        ),
      ),
      summarizeSimpleSet({
        label: "Locations: WC450LOCATION -> location",
        sourceRows: locationRows,
        targetRows: targetLocations,
        sourceValues: locations,
      }),
      summarizeSimpleSet({
        label: "Item Categories: WC510CATEGORY -> item_category",
        sourceRows: categoryRows,
        targetRows: targetCategories,
        sourceValues: categories,
      }),
      summarizeSimpleSet({
        label: "Item Subcategories: WC520SUBCAT -> item_subcategory",
        sourceRows: subcategoryRows,
        targetRows: targetSubcategories,
        sourceValues: subcategories,
      }),
      summarizeSimpleSet({
        label: "Cities: MF100/MF110/MF120 -> city",
        sourceRows: cityRows,
        targetRows: targetCities,
        sourceValues: cities,
      }),
      section(
        "Employees: EM200EMPLOYEE -> employee",
        [
          `Source rows: ${employeeRows.length}`,
          `Existing target employees: ${targetEmployees.length}`,
          `Would insert by employee id: ${employeeComparison.wouldInsert.length}`,
          `Missing password: ${employeeMissingPassword}`,
          `Missing birthdate: ${employeeMissingBirthdate}`,
          `Missing nickname: ${employeeMissingNickname}`,
          "",
          "Would insert employee ids sample:",
          formatList(employeeComparison.wouldInsert),
          "",
          "Employee migration needs a default strategy for required app fields: date_of_birth, gender, nickname, and password.",
        ].join("\n"),
      ),
      "## Current Decision Status",
      "",
      "- ID type and hair/eye color mapping is approved in `reports/static-migration.md`.",
      "- Location mapping is approved in `mappings/location-mapping.json`; unresolved legacy locations map to `UNKNOWN`.",
      "- Item category simplification is approved in `mappings/category-mapping.json`.",
      "- Employee migration is still pending; password/nickname/default DOB rules are not finalized.",
      "",
    ].join("\n");

    fs.writeFileSync(reportPath, report);
    console.log(`Dry-run report written to ${reportPath}`);
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
