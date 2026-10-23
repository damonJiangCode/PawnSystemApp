#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const csv = require("csv-parser");
const { Pool } = require("pg");

const migrationRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(migrationRoot, "..");
const sourceDbPath = path.join(migrationRoot, "source", "superpawnconv.mdb");
const summaryDir =
  process.env.MIGRATION_REPORT_DIR || path.join(migrationRoot, "reports");
const reportPath = path.join(summaryDir, "client-migration.md");
const shouldCommit = process.argv.includes("--commit");

const dbConfig = {
  user: process.env.DB_USER || "moneyexpress",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "pawnsystemdb_migration",
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
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

const HAIR_COLOR_MAPPING = {
  UNKNOWN: "OTHER",
  AUBURN: "OTHER",
  AUDURN: "OTHER",
  DYED: "OTHER",
  GRAYING: "GRAY",
  GREYING: "GRAY",
  SANDY: "OTHER",
  "DARK BROWN": "BROWN",
  "DARK BROWNR": "BROWN",
  "LIGHT BROWN": "BROWN",
  "DARK BLONDE": "BLONDE",
  "LIGHT BLONDE": "BLONDE",
  BLACKK: "BLACK",
  BLK: "BLACK",
  BLBL: "BLACK",
  BOLD: "BALD",
  BORWN: "BROWN",
  BRBR: "BROWN",
  BRO: "BROWN",
  BROWBN: "BROWN",
  BROWNR: "BROWN",
  BVR: "BROWN",
  "E505 AVE": "OTHER",
};

const EYE_COLOR_MAPPING = {
  GREY: "GRAY",
  "DARK BROWN": "BROWN",
  "LIGHT BROWN": "BROWN",
  BACK: "BLACK",
  BK: "BLACK",
  BLACKCK: "BLACK",
  BLACKD: "BLACK",
  BLUEE: "BLUE",
  BLUEBL: "BLUE",
  BLUEBR: "BLUE",
  BLUEU: "BLUE",
  BR: "BROWN",
  BRB: "BROWN",
  BRN: "BROWN",
  BROWM: "BROWN",
  "BROWN  .": "BROWN",
  BROWNR: "BROWN",
  BROWNWN: "BROWN",
  BUW: "BROWN",
  GEEN: "GREEN",
};

const DEFAULT_DATE_OF_BIRTH = "1900-01-01";
const DEFAULT_MISSING_NAME = "null";
const OTHER_MIGRATION_CLIENT = {
  first_name: "Unknown",
  last_name: "Legacy Client",
  middle_name: null,
  date_of_birth: DEFAULT_DATE_OF_BIRTH,
  gender: "Other",
  hair_color: "OTHER",
  eye_color: "OTHER",
  height_cm: 170,
  weight_kg: 70,
  address: "Migration fallback client",
  postal_code: null,
  city: "Other",
  province: "Other",
  country: "Other",
  email: null,
  phone: null,
  notes:
    "Fallback client for legacy tickets whose client number is missing from AR200CLIENT.",
  image_path: "",
  pickup_self_only: false,
  redeem_count: 0,
  sell_count: 0,
  expire_count: 0,
  overdue_count: 0,
};
const INSERT_BATCH_SIZE = 1000;

const normalizeText = (value) => String(value ?? "").trim();
const normalizeUpper = (value) => normalizeText(value).toUpperCase();
const normalizeCityKeyPart = (value) =>
  normalizeUpper(value).replace(/\./g, "").replace(/\s+/g, " ");

const normalizeMigrationLocation = (city, province, country) => {
  const resolvedCountry = country || "Canada";
  if (normalizeCityKeyPart(resolvedCountry) !== "CANADA") {
    return { city: "Other", province: "Other", country: "Other" };
  }

  return { city, province, country: "Canada" };
};

const cleanNullable = (value) => {
  const normalized = normalizeText(value);
  return normalized && normalized !== "-" ? normalized : "";
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
    const child = spawn(
      "mdb-export",
      ["-b", "strip", sourceDbPath, tableName],
      {
        cwd: projectRoot,
      },
    );

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

const parseLegacyDate = (value) => {
  const raw = normalizeText(value);
  if (!raw) {
    return "";
  }

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s|$)/);
  if (!match) {
    return "";
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const rawYear = Number(match[3]);
  const year =
    match[3].length === 2
      ? rawYear <= 26
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

  const today = new Date();
  const minDate = new Date(Date.UTC(1900, 0, 1));
  if (date > today || date < minDate) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const parseNumber = (value) => {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
};

const mapGender = (value) => {
  const normalized = normalizeUpper(value);
  if (normalized === "M" || normalized === "MALE") {
    return { value: "Male", defaulted: false };
  }
  if (normalized === "F" || normalized === "FEMALE") {
    return { value: "Female", defaulted: false };
  }
  return { value: "Other", defaulted: true };
};

const mapColor = (rawValue, lookup, extraMapping) => {
  const raw = normalizeText(rawValue);
  const lookupValue = lookup.get(normalizeUpper(raw)) || raw;
  const normalized = normalizeUpper(lookupValue);
  return extraMapping[normalized] || normalized;
};

const mapIdType = (code) => {
  const normalized = normalizeUpper(code);
  if (!normalized) {
    return "Other";
  }
  return ID_TYPE_MAPPING[normalized] || "";
};

const nonNegativeCounter = (value) => {
  const parsed = parseNumber(value) || 0;
  return parsed < 0 ? 0 : parsed;
};

const buildAddress = (addressValue, aptValue) => {
  const address = cleanNullable(addressValue);
  const aptNo = cleanNullable(aptValue);
  if (!aptNo) {
    return address;
  }

  return [`APT ${aptNo}`, address].filter(Boolean).join(" ");
};

const normalizePhone = (areaCode, phone) => {
  const combined = `${normalizeText(areaCode)} ${normalizeText(phone)}`.trim();
  return {
    digits: combined.replace(/\D/g, ""),
    value: normalizeText(phone) || normalizeText(areaCode),
  };
};

const increment = (map, key, amount = 1) => {
  map.set(key, (map.get(key) || 0) + amount);
};

const samplePush = (samples, value, limit = 20) => {
  if (samples.length < limit) {
    samples.push(value);
  }
};

const topCounts = (map, limit = 30) =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);

const formatCountTable = (rows) => {
  if (!rows.length) {
    return "_none_";
  }

  return [
    "```txt",
    ...rows.map(([label, count]) => `${String(count).padStart(7)}  ${label}`),
    "```",
  ].join("\n");
};

const formatList = (values, limit = 20) => {
  if (!values.length) {
    return "_none_";
  }

  const visible = values.slice(0, limit).map((value) => `- ${value}`);
  if (values.length > limit) {
    visible.push(`- ... ${values.length - limit} more`);
  }
  return visible.join("\n");
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

const buildPlaceholders = (rows, columnsPerRow) =>
  rows
    .map((_, rowIndex) => {
      const offset = rowIndex * columnsPerRow;
      return `(${Array.from(
        { length: columnsPerRow },
        (_value, columnIndex) => `$${offset + columnIndex + 1}`,
      ).join(",")})`;
    })
    .join(",");

const insertClients = async (pool, clients) => {
  for (let offset = 0; offset < clients.length; offset += INSERT_BATCH_SIZE) {
    const batch = clients.slice(offset, offset + INSERT_BATCH_SIZE);
    const columns = [
      "client_number",
      "first_name",
      "last_name",
      "middle_name",
      "date_of_birth",
      "gender",
      "hair_color",
      "eye_color",
      "height_cm",
      "weight_kg",
      "address",
      "postal_code",
      "city",
      "province",
      "country",
      "email",
      "phone",
      "notes",
      "image_path",
      "pickup_self_only",
      "redeem_count",
      "sell_count",
      "expire_count",
      "overdue_count",
    ];
    const values = batch.flatMap((client) => [
      client.client_number,
      client.first_name,
      client.last_name,
      client.middle_name || null,
      client.date_of_birth,
      client.gender,
      client.hair_color,
      client.eye_color,
      client.height_cm,
      client.weight_kg,
      client.address || null,
      client.postal_code || null,
      client.city || null,
      client.province || null,
      client.country || null,
      client.email || null,
      client.phone || null,
      client.notes || null,
      client.image_path,
      client.pickup_self_only,
      client.redeem_count,
      client.sell_count,
      client.expire_count,
      client.overdue_count,
    ]);

    await pool.query(
      `
        INSERT INTO client (${columns.join(",")})
        VALUES ${buildPlaceholders(batch, columns.length)}
      `,
      values,
    );
  }
};

const insertClientIds = async (pool, ids) => {
  for (let offset = 0; offset < ids.length; offset += INSERT_BATCH_SIZE) {
    const batch = ids.slice(offset, offset + INSERT_BATCH_SIZE);
    const values = batch.flatMap((id) => [
      id.client_number,
      id.id_type,
      id.id_value,
    ]);

    await pool.query(
      `
        INSERT INTO client_id (client_number, id_type, id_value)
        VALUES ${buildPlaceholders(batch, 3)}
      `,
      values,
    );
  }
};

const main = async () => {
  // Use the configured historical baseline, never the migration execution date.
  fs.mkdirSync(summaryDir, { recursive: true });
  if (!process.env.DB_PASSWORD) {
    throw new Error("Set DB_PASSWORD in private environment configuration.");
  }

  const pool = new Pool(dbConfig);

  try {
    const [clientRows, hairRows, eyeRows, cityRows, provinceRows, countryRows] =
      await Promise.all([
        readAccessTable("AR200CLIENT"),
        readAccessTable("BW010HAIRCODE"),
        readAccessTable("BW015EYECODE"),
        readAccessTable("MF100CITY"),
        readAccessTable("MF110PROVINCE"),
        readAccessTable("MF120COUNTRY"),
      ]);

    const [
      targetHairColors,
      targetEyeColors,
      targetIdTypes,
      targetCities,
      existingClients,
      existingOtherMigrationClient,
    ] = await Promise.all([
      pool.query("SELECT color FROM hair_color"),
      pool.query("SELECT color FROM eye_color"),
      pool.query("SELECT type FROM id_type"),
      pool.query("SELECT city, province, country FROM city"),
      pool.query("SELECT client_number FROM client"),
      pool.query(
        "SELECT client_number FROM client WHERE first_name = 'Unknown' AND last_name = 'Legacy Client' ORDER BY client_number LIMIT 1",
      ),
    ]);

    const hairTargets = new Set(targetHairColors.rows.map((row) => row.color));
    const eyeTargets = new Set(targetEyeColors.rows.map((row) => row.color));
    const idTypeTargets = new Set(targetIdTypes.rows.map((row) => row.type));
    const existingClientNumbers = new Set(
      existingClients.rows.map((row) => String(row.client_number)),
    );
    const targetCityKeys = new Set(
      targetCities.rows.map(
        (row) =>
          `${normalizeUpper(row.city)}|${normalizeUpper(row.province)}|${normalizeUpper(
            row.country,
          )}`,
      ),
    );

    const hairLookup = new Map(
      hairRows.map((row) => [
        normalizeUpper(getValue(row, "BW010HARICODEme")),
        normalizeText(getValue(row, "BW010HAIRCODE")),
      ]),
    );
    const eyeLookup = new Map(
      eyeRows.map((row) => [
        normalizeUpper(getValue(row, "BW015EYECODEme")),
        normalizeText(getValue(row, "BW015EYECODE")),
      ]),
    );
    const countryByCode = buildLookupByCode(countryRows, "MF120CODE", (row) =>
      normalizeText(getValue(row, "MF120COUNTRY")),
    );
    const provinceByCode = buildLookupByCode(
      provinceRows,
      "MF110CODE",
      (row) => ({
        province: normalizeText(getValue(row, "MF110PROVINCE")),
        countryCode: normalizeText(getValue(row, "MF110COUNTRYCODE")),
      }),
    );
    const cityByCode = buildLookupByCode(cityRows, "MF100CITY", (row) => {
      const provinceCode = normalizeText(getValue(row, "MF100PROVINCENO"));
      const province = provinceByCode.get(provinceCode);
      const countryCode =
        province?.countryCode ||
        normalizeText(getValue(row, "MF110COUNTRYCODE"));
      return {
        city: normalizeText(getValue(row, "MF100NAME")),
        province:
          province?.province || normalizeText(getValue(row, "MF100PROVSHNAME")),
        country: countryByCode.get(countryCode) || "",
      };
    });

    const sourceClientNumbers = new Set();
    const numericSourceClientNumbers = clientRows
      .map((row) => Number(normalizeText(getValue(row, "AR200CLIENT"))))
      .filter((value) => Number.isFinite(value));
    const numericExistingClientNumbers = [...existingClientNumbers]
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    let nextGeneratedClientNumber =
      Math.max(
        0,
        ...numericSourceClientNumbers,
        ...numericExistingClientNumbers,
      ) + 1;

    const clientsToInsert = [];
    const clientIdsToInsert = [];
    const duplicateClientNumbers = [];
    const blockerCounts = new Map();
    const warningCounts = new Map();
    const idTypeCounts = new Map();
    const hairCounts = new Map();
    const eyeCounts = new Map();
    const genderCounts = new Map();
    const provinceCounts = new Map();
    const countryCounts = new Map();
    const blockedSamples = [];
    const warningSamples = [];

    let blocked = 0;
    let noIds = 0;
    let oneId = 0;
    let twoOrMoreIds = 0;
    let cityMissCount = 0;
    let otherMigrationClientNumber =
      existingOtherMigrationClient.rows[0]?.client_number || null;

    for (const row of clientRows) {
      const sourceClientNumber = normalizeText(getValue(row, "AR200CLIENT"));
      let clientNumber = sourceClientNumber;
      const rowBlockers = [];
      const rowWarnings = [];

      if (!sourceClientNumber) {
        rowBlockers.push("missing client number");
      } else if (sourceClientNumbers.has(sourceClientNumber)) {
        clientNumber = String(nextGeneratedClientNumber);
        nextGeneratedClientNumber += 1;
        duplicateClientNumbers.push(`${sourceClientNumber} -> ${clientNumber}`);
        rowWarnings.push(
          `duplicate source client number reassigned from ${sourceClientNumber} to ${clientNumber}`,
        );
      } else {
        sourceClientNumbers.add(sourceClientNumber);
      }

      if (existingClientNumbers.has(clientNumber)) {
        rowBlockers.push("client number already exists in target");
      }

      const rawFirstName = cleanNullable(getValue(row, "AR200FIRSTNAME"));
      const rawLastName = cleanNullable(getValue(row, "AR200LASTNAME"));
      const firstName = rawFirstName || DEFAULT_MISSING_NAME;
      const lastName = rawLastName || DEFAULT_MISSING_NAME;
      if (!rawFirstName) {
        rowWarnings.push(
          `missing first name defaulted to ${DEFAULT_MISSING_NAME}`,
        );
      }
      if (!rawLastName) {
        rowWarnings.push(
          `missing last name defaulted to ${DEFAULT_MISSING_NAME}`,
        );
      }

      const parsedDateOfBirth =
        parseLegacyDate(getValue(row, "AR200BIRTHDATE")) ||
        parseLegacyDate(getValue(row, "AR200BIRTHDAY"));
      const dateOfBirth = parsedDateOfBirth || DEFAULT_DATE_OF_BIRTH;
      if (!parsedDateOfBirth) {
        rowWarnings.push(
          `missing/invalid date of birth defaulted to ${DEFAULT_DATE_OF_BIRTH}`,
        );
      }

      const gender = mapGender(getValue(row, "AR200SEX"));
      increment(genderCounts, gender.value);
      if (gender.defaulted) {
        rowWarnings.push("gender defaulted to Other");
      }

      const hairColor = mapColor(
        getValue(row, "AR200HAIRCODE"),
        hairLookup,
        HAIR_COLOR_MAPPING,
      );
      const eyeColor = mapColor(
        getValue(row, "AR200EYECODE"),
        eyeLookup,
        EYE_COLOR_MAPPING,
      );
      increment(hairCounts, hairColor || "<blank>");
      increment(eyeCounts, eyeColor || "<blank>");
      if (!hairColor || !hairTargets.has(hairColor)) {
        rowBlockers.push(
          `unmapped hair color: ${normalizeText(getValue(row, "AR200HAIRCODE")) || "<blank>"}`,
        );
      }
      if (!eyeColor || !eyeTargets.has(eyeColor)) {
        rowBlockers.push(
          `unmapped eye color: ${normalizeText(getValue(row, "AR200EYECODE")) || "<blank>"}`,
        );
      }

      const heightCm = parseNumber(getValue(row, "AR200HEIGHT"));
      const weightKg = parseNumber(getValue(row, "AR200WEIGHT"));
      if (heightCm === undefined) {
        rowBlockers.push("missing height");
      } else if (heightCm <= 0 || heightCm > 260) {
        rowWarnings.push(`unusual height: ${heightCm}`);
      }
      if (weightKg === undefined) {
        rowBlockers.push("missing weight");
      } else if (weightKg <= 0 || weightKg > 300) {
        rowWarnings.push(`unusual weight: ${weightKg}`);
      }

      const phone = normalizePhone(
        getValue(row, "AR200AREACODE"),
        getValue(row, "AR200PHONE"),
      );
      if (!phone.value || phone.digits.length < 7) {
        rowWarnings.push("missing/short phone");
      }

      const cityInfo = cityByCode.get(
        normalizeText(getValue(row, "AR200CITYNO")),
      );
      const provinceInfo = provinceByCode.get(
        normalizeText(getValue(row, "AR200PROVINCENO")),
      );
      const location = normalizeMigrationLocation(
        cityInfo?.city || cleanNullable(getValue(row, "AR200CITY")),
        cityInfo?.province ||
          provinceInfo?.province ||
          cleanNullable(getValue(row, "AR200PROVINCE")),
        cityInfo?.country ||
          countryByCode.get(normalizeText(getValue(row, "AR200COUNTRY"))) ||
          "Canada",
      );
      const { city, province, country } = location;
      const cityKey = `${normalizeUpper(city)}|${normalizeUpper(province)}|${normalizeUpper(country)}`;
      if (!targetCityKeys.has(cityKey)) {
        cityMissCount += 1;
        rowBlockers.push(
          `city missing in target: ${city} / ${province} / ${country}`,
        );
      }
      increment(provinceCounts, province || "<blank>");
      increment(countryCounts, country || "<blank>");

      const ids = [];
      for (let index = 1; index <= 5; index += 1) {
        const code = normalizeUpper(getValue(row, `AR200ID_${index}`));
        const value = cleanNullable(getValue(row, `AR200ID_${index}_NO`));
        if (!code && !value) {
          continue;
        }

        const mappedType = mapIdType(code);
        if (!mappedType) {
          if (code !== "PHO") {
            rowWarnings.push(`skipped unmapped ID code ${code || "<blank>"}`);
          }
          continue;
        }
        if (!idTypeTargets.has(mappedType)) {
          rowBlockers.push(`mapped ID type missing in target: ${mappedType}`);
          continue;
        }
        if (!value) {
          rowWarnings.push(`ID ${index} has type but no value`);
          continue;
        }

        increment(idTypeCounts, mappedType);
        ids.push({
          client_number: Number(clientNumber),
          id_type: mappedType,
          id_value: value,
        });
      }

      if (ids.length === 0) {
        noIds += 1;
        rowWarnings.push("no importable IDs");
      } else if (ids.length === 1) {
        oneId += 1;
        rowWarnings.push("only one importable ID");
      } else {
        twoOrMoreIds += 1;
      }

      const counters = {
        redeem_count: nonNegativeCounter(getValue(row, "AR200REDEEM")),
        sell_count: nonNegativeCounter(getValue(row, "AR200BUY")),
        expire_count: nonNegativeCounter(getValue(row, "AR200DELINQ")),
        overdue_count: nonNegativeCounter(getValue(row, "AR200ACTIVE")),
      };
      const rawCounters = {
        redeem_count: parseNumber(getValue(row, "AR200REDEEM")) || 0,
        sell_count: parseNumber(getValue(row, "AR200BUY")) || 0,
        expire_count: parseNumber(getValue(row, "AR200DELINQ")) || 0,
        overdue_count: parseNumber(getValue(row, "AR200ACTIVE")) || 0,
      };
      for (const [counterName, value] of Object.entries(rawCounters)) {
        if (value < 0) {
          rowWarnings.push(
            `${counterName} negative value ${value} defaulted to 0`,
          );
        }
      }

      if (rowBlockers.length) {
        blocked += 1;
        for (const blocker of rowBlockers) {
          increment(blockerCounts, blocker);
        }
        samplePush(
          blockedSamples,
          `${clientNumber || "<blank>"} ${firstName} ${lastName}: ${rowBlockers.join("; ")}`,
        );
      } else {
        clientsToInsert.push({
          client_number: Number(clientNumber),
          first_name: firstName,
          last_name: lastName,
          middle_name: cleanNullable(getValue(row, "AR200MIDDLENAME")),
          date_of_birth: dateOfBirth,
          gender: gender.value,
          hair_color: hairColor,
          eye_color: eyeColor,
          height_cm: heightCm,
          weight_kg: weightKg,
          address: buildAddress(
            getValue(row, "AR200ADDRESS"),
            getValue(row, "AR200APTNO"),
          ),
          postal_code: cleanNullable(getValue(row, "AR200PCODE")),
          city,
          province,
          country,
          email: cleanNullable(getValue(row, "AR200EMAILADDRESS")),
          phone: phone.value,
          notes: cleanNullable(getValue(row, "AR200CLIENTMEMO")),
          image_path: "",
          pickup_self_only: false,
          ...counters,
        });
        clientIdsToInsert.push(...ids);
      }

      for (const warning of rowWarnings) {
        increment(warningCounts, warning);
      }
      if (rowWarnings.length) {
        samplePush(
          warningSamples,
          `${clientNumber}: ${rowWarnings.join("; ")}`,
        );
      }
    }

    if (!otherMigrationClientNumber) {
      otherMigrationClientNumber = nextGeneratedClientNumber;
      nextGeneratedClientNumber += 1;
      clientsToInsert.push({
        client_number: otherMigrationClientNumber,
        ...OTHER_MIGRATION_CLIENT,
      });
      samplePush(
        warningSamples,
        `${otherMigrationClientNumber}: Unknown Legacy Client fallback client inserted`,
      );
      increment(
        warningCounts,
        "Unknown Legacy Client fallback client inserted",
      );
    }

    let insertedClients = 0;
    let insertedClientIds = 0;

    if (shouldCommit) {
      if (blocked > 0) {
        throw new Error(
          `Refusing to commit because ${blocked} client rows still have blockers.`,
        );
      }

      await pool.query("BEGIN");
      try {
        await insertClients(pool, clientsToInsert);
        await insertClientIds(pool, clientIdsToInsert);
        await pool.query(
          "SELECT setval(pg_get_serial_sequence('client', 'client_number'), (SELECT COALESCE(MAX(client_number), 1) FROM client), true)",
        );
        const clientCount = await pool.query(
          "SELECT count(*)::int AS count FROM client",
        );
        const idCount = await pool.query(
          "SELECT count(*)::int AS count FROM client_id",
        );
        insertedClients = clientsToInsert.length;
        insertedClientIds = clientIdsToInsert.length;
        await pool.query("COMMIT");

        if (
          clientCount.rows[0].count < insertedClients ||
          idCount.rows[0].count < insertedClientIds
        ) {
          throw new Error(
            "Post-commit counts were lower than inserted row counts.",
          );
        }
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    }

    const report = [
      "# Client Migration",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      `Mode: ${shouldCommit ? "commit" : "dry-run"}`,
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
      `Legacy AR200CLIENT rows: ${clientRows.length}`,
      `Existing target clients before migration: ${existingClientNumbers.size}`,
      `Prepared client rows: ${clientsToInsert.length}`,
      `Prepared client_id rows: ${clientIdsToInsert.length}`,
      `Unknown Legacy Client fallback client number: ${otherMigrationClientNumber || "already exists"}`,
      `Blocked client rows: ${blocked}`,
      `Duplicate source client numbers reassigned: ${duplicateClientNumbers.length}`,
      `Clients with 0 importable IDs: ${noIds}`,
      `Clients with 1 importable ID: ${oneId}`,
      `Clients with 2+ importable IDs: ${twoOrMoreIds}`,
      `Rows with missing target city combos: ${cityMissCount}`,
      `Inserted clients: ${insertedClients}`,
      `Inserted client IDs: ${insertedClientIds}`,
      "```",
      "",
      "## Insert Rules",
      "",
      "- Preserve legacy client numbers unless the source number is duplicated.",
      "- Reassign duplicate legacy client numbers to new numbers above the legacy max.",
      `- Default missing/invalid DOB to ${DEFAULT_DATE_OF_BIRTH}.`,
      `- Default missing first/last names to literal ${DEFAULT_MISSING_NAME}.`,
      "- Map non-Canada locations to `Other / Other / Other`.",
      "- Prefix `AR200APTNO` onto `address` as `APT {aptNo}`.",
      "- Import `AR200CLIENTMEMO` into `notes`.",
      "- Default negative legacy client counters to `0` so target check constraints pass.",
      "- Import valid ID slots from `AR200ID_1` through `AR200ID_5`; skip `PHO`.",
      "- Leave `image_path` blank for now.",
      "- Leave hold_until unset (NULL), including the fallback client; holds are optional and set by users later.",
      "",
      "## Blockers",
      "",
      formatCountTable(topCounts(blockerCounts, 60)),
      "",
      "Blocked samples:",
      "",
      formatList(blockedSamples, 25),
      "",
      "## Warnings",
      "",
      formatCountTable(topCounts(warningCounts, 60)),
      "",
      "Warning samples:",
      "",
      formatList(warningSamples, 25),
      "",
      "## Duplicate Client Number Reassignments",
      "",
      formatList(duplicateClientNumbers, 40),
      "",
      "## Mapped ID Type Usage",
      "",
      formatCountTable(topCounts(idTypeCounts, 40)),
      "",
      "## Reference Usage",
      "",
      "Hair color target usage:",
      "",
      formatCountTable(topCounts(hairCounts, 30)),
      "",
      "Eye color target usage:",
      "",
      formatCountTable(topCounts(eyeCounts, 30)),
      "",
      "Gender target usage:",
      "",
      formatCountTable(topCounts(genderCounts, 10)),
      "",
      "Province usage after migration mapping:",
      "",
      formatCountTable(topCounts(provinceCounts, 30)),
      "",
      "Country usage after migration mapping:",
      "",
      formatCountTable(topCounts(countryCounts, 10)),
      "",
    ].join("\n");

    fs.writeFileSync(reportPath, report);
    console.log(
      `Client migration ${shouldCommit ? "commit" : "dry-run"} written to ${reportPath}`,
    );
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
