#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const csv = require("csv-parser");
const { Pool } = require("pg");

const migrationRoot = path.resolve(__dirname, "..");
const sourceDbPath = path.join(migrationRoot, "source", "superpawnconv.mdb");
const summaryDir = path.join(migrationRoot, "reports");
const reportPath = path.join(summaryDir, "item-migration.md");
const categoryReportPath = path.join(summaryDir, "category-migration.md");
const shouldCommit = process.argv.includes("--commit");

const dbConfig = {
  user: process.env.DB_USER || "moneyexpress",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "pawnsystemdb_migration",
  password: process.env.DB_PASSWORD || "0236",
  port: Number(process.env.DB_PORT || 5432),
};

const INSERT_BATCH_SIZE = 1000;
const UNKNOWN_DESCRIPTION = "Unknown item";

const normalizeText = (value) => String(value ?? "").trim();
const normalizeKey = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
const parseNumber = (value) => {
  const parsed = Number(normalizeText(value));
  return Number.isFinite(parsed) ? parsed : undefined;
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
    ...rows.map(([label, count]) => `${String(count).padStart(8)}  ${label}`),
    "```",
  ].join("\n");
};
const samplePush = (samples, value, limit = 30) => {
  if (samples.length < limit) samples.push(value);
};
const formatSamples = (samples) =>
  samples.length ? samples.map((sample) => `- ${sample}`).join("\n") : "_none_";

const readAccessTable = (tableName) =>
  new Promise((resolve, reject) => {
    const rows = [];
    const child = spawn("mdb-export", ["-b", "strip", sourceDbPath, tableName]);
    let stderr = "";

    child.stdout.pipe(csv()).on("data", (row) => rows.push(row));
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(rows);
      else reject(new Error(`mdb-export ${tableName} failed: ${stderr}`));
    });
  });

const targetKey = (category, subcategory) =>
  `${normalizeKey(category)} / ${normalizeKey(subcategory)}`;

const parseCategoryReportMappings = () => {
  const content = fs.readFileSync(categoryReportPath, "utf8");
  const subcategoryRules = new Map();
  const parentRules = new Map();
  let inOtherRules = false;

  for (const blockMatch of content.matchAll(/```txt\r?\n([\s\S]*?)```/g)) {
    const lines = blockMatch[1]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.some((line) => line.includes("->"))) continue;

    const pendingSources = [];
    for (const line of lines) {
      if (line.includes("Use the legacy parent category")) {
        inOtherRules = true;
        continue;
      }

      const targetMatch = line.match(/^(.+?)\s*->\s*(.+?)\s*\/\s*(.+)$/);
      if (targetMatch) {
        const inlineSource = normalizeText(targetMatch[1]);
        const target = {
          category: normalizeText(targetMatch[2]),
          subcategory: normalizeText(targetMatch[3]),
        };

        if (inlineSource && inlineSource !== "->") {
          parentRules.set(normalizeKey(inlineSource), target);
        } else {
          for (const source of pendingSources.splice(0)) {
            subcategoryRules.set(normalizeKey(source), target);
          }
        }
        continue;
      }

      if (line.startsWith("->")) {
        const [, category, subcategory] =
          line.match(/^->\s*(.+?)\s*\/\s*(.+)$/) || [];
        if (category && subcategory) {
          for (const source of pendingSources.splice(0)) {
            const map = inOtherRules ? parentRules : subcategoryRules;
            map.set(normalizeKey(source), {
              category: normalizeText(category),
              subcategory: normalizeText(subcategory),
            });
          }
        }
        continue;
      }

      pendingSources.push(line);
    }

    if (blockMatch[0].includes("Jewellery ->")) inOtherRules = true;
  }

  for (const [code, target] of [
    ["7777", { category: "OTHER", subcategory: "other" }],
    ["7779", { category: "OTHER", subcategory: "other" }],
  ]) {
    subcategoryRules.set(code, target);
  }

  if (subcategoryRules.size <= 2 || !parentRules.size) {
    throw new Error("Category mapping rules were not loaded; refusing OTHER-only migration");
  }
  return { subcategoryRules, parentRules };
};

const buildLegacyLookup = async () => {
  const [subcategories, categories] = await Promise.all([
    readAccessTable("WC520SUBCAT"),
    readAccessTable("WC510CATEGORY"),
  ]);
  const legacySubcategoryByCode = new Map();
  const legacyCategoryByCode = new Map();

  for (const row of subcategories) {
    legacySubcategoryByCode.set(normalizeText(row.WC520CODE), {
      description: normalizeText(row.WC520DESC),
      categoryCode: normalizeText(row.WC520CATEGORYCODE),
    });
  }
  for (const row of categories) {
    legacyCategoryByCode.set(normalizeText(row.WC510CODE), {
      description: normalizeText(row.WC510DESCRIPTION),
    });
  }

  return { legacySubcategoryByCode, legacyCategoryByCode };
};

const resolveSubcategory = ({
  legacySubcategoryCode,
  legacyCategoryCode,
  legacySubcategoryByCode,
  legacyCategoryByCode,
  subcategoryRules,
  parentRules,
  targetSubcategoryIds,
}) => {
  const legacySubcategory = legacySubcategoryByCode.get(legacySubcategoryCode);
  const legacyCategory =
    legacyCategoryByCode.get(legacyCategoryCode) ||
    legacyCategoryByCode.get(legacySubcategory?.categoryCode || "");
  const subcategoryDescription = legacySubcategory?.description || "";
  const categoryDescription = legacyCategory?.description || "";
  const subKey = normalizeKey(subcategoryDescription || legacySubcategoryCode);
  const categoryKey = normalizeKey(categoryDescription);
  const isOtherLike =
    !subKey ||
    subKey === "other" ||
    subKey === "other games" ||
    subKey === "blank" ||
    subKey === "7777" ||
    subKey === "7779";

  const candidates = [];
  if (!isOtherLike && subcategoryRules.has(subKey)) {
    candidates.push({
      ...subcategoryRules.get(subKey),
      reason: "subcategory rule",
      legacySubcategory: subcategoryDescription || legacySubcategoryCode,
      legacyCategory: categoryDescription || legacyCategoryCode,
    });
  }
  if (parentRules.has(categoryKey)) {
    candidates.push({
      ...parentRules.get(categoryKey),
      reason: isOtherLike ? "parent fallback" : "parent category fallback",
      legacySubcategory: subcategoryDescription || legacySubcategoryCode,
      legacyCategory: categoryDescription || legacyCategoryCode,
    });
  }
  candidates.push({
    category: "OTHER",
    subcategory: "other",
    reason: "global other fallback",
    legacySubcategory: subcategoryDescription || legacySubcategoryCode || "<blank>",
    legacyCategory: categoryDescription || legacyCategoryCode || "<blank>",
  });

  for (const candidate of candidates) {
    const id = targetSubcategoryIds.get(
      targetKey(candidate.category, candidate.subcategory),
    );
    if (id) return { ...candidate, id };
  }

  return {
    category: "OTHER",
    subcategory: "other",
    id: targetSubcategoryIds.get(targetKey("OTHER", "other")),
    reason: "target missing fallback",
    legacySubcategory: subcategoryDescription || legacySubcategoryCode || "<blank>",
    legacyCategory: categoryDescription || legacyCategoryCode || "<blank>",
  };
};

const mapLegacyItem = (row, prefix, source, context, itemNumberOverride) => {
  const itemNumber = itemNumberOverride ?? parseNumber(row[`${prefix}ITEMNO`]);
  const quantity = parseNumber(row[`${prefix}QTY`]);
  const amount = parseNumber(row[`${prefix}ESTMVAL`]);
  const mappedSubcategory = resolveSubcategory({
    legacySubcategoryCode: normalizeText(row[`${prefix}ITEMSUBCAT`]),
    legacyCategoryCode: normalizeText(row[`${prefix}ITEMCAT`]),
    ...context,
  });

  return {
    item_number: itemNumber,
    ticket_number: parseNumber(row[`${prefix}TRANACTNO`]),
    legacy_item_number: parseNumber(row[`${prefix}ITEMNO`]),
    source,
    quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
    quantity_defaulted: !(Number.isInteger(quantity) && quantity > 0),
    subcategory_id: mappedSubcategory.id,
    category_name: mappedSubcategory.category,
    subcategory_name: mappedSubcategory.subcategory,
    category_reason: mappedSubcategory.reason,
    legacy_subcategory: mappedSubcategory.legacySubcategory,
    legacy_category: mappedSubcategory.legacyCategory,
    description: normalizeText(row[`${prefix}DESCRIPTION`]) || UNKNOWN_DESCRIPTION,
    description_defaulted: !normalizeText(row[`${prefix}DESCRIPTION`]),
    brand_name: normalizeText(row[`${prefix}TRADEMARK`]) || null,
    model_number: normalizeText(row[`${prefix}MODELNO`]) || null,
    serial_number: normalizeText(row[`${prefix}SERIALNO`]) || null,
    amount: amount !== undefined && amount >= 0 ? amount : 0,
    amount_defaulted: !(amount !== undefined && amount >= 0),
    image_path: "",
  };
};

const buildInsert = (table, columns, rows) => {
  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const rowPlaceholders = columns.map((_, columnIndex) => {
      const parameterIndex = rowIndex * columns.length + columnIndex + 1;
      return `$${parameterIndex}`;
    });
    values.push(...columns.map((column) => row[column]));
    return `(${rowPlaceholders.join(",")})`;
  });
  return {
    text: `INSERT INTO ${table} (${columns.join(",")}) VALUES ${placeholders.join(",")}`,
    values,
  };
};

const insertBatches = async (client, table, columns, rows) => {
  for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + INSERT_BATCH_SIZE);
    const query = buildInsert(table, columns, batch);
    await client.query(query.text, query.values);
  }
};

const main = async () => {
  fs.mkdirSync(summaryDir, { recursive: true });
  const pool = new Pool(dbConfig);
  const client = await pool.connect();

  try {
    const [
      wcRows,
      saRows,
      legacyLookup,
      mappingRules,
      subcategoryResult,
      ticketResult,
    ] = await Promise.all([
      readAccessTable("WC400INVEN"),
      readAccessTable("SA110ITEM"),
      buildLegacyLookup(),
      parseCategoryReportMappings(),
      pool.query(`
        SELECT c.name AS category_name, s.name AS subcategory_name, s.id
        FROM item_subcategory s
        INNER JOIN item_category c ON c.id = s.category_id
        WHERE c.is_active = TRUE AND s.is_active = TRUE
      `),
      pool.query("SELECT ticket_number FROM ticket"),
    ]);

    const targetSubcategoryIds = new Map(
      subcategoryResult.rows.map((row) => [
        targetKey(row.category_name, row.subcategory_name),
        Number(row.id),
      ]),
    );
    const migratedTickets = new Set(
      ticketResult.rows.map((row) => Number(row.ticket_number)),
    );
    const context = {
      ...legacyLookup,
      ...mappingRules,
      targetSubcategoryIds,
    };
    let maxSourceItemNumber = 0;
    for (const row of wcRows) {
      const value = parseNumber(row.WC400ITEMNO);
      if (Number.isSafeInteger(value) && value > maxSourceItemNumber) {
        maxSourceItemNumber = value;
      }
    }
    for (const row of saRows) {
      const value = parseNumber(row.SA110ITEMNO);
      if (Number.isSafeInteger(value) && value > maxSourceItemNumber) {
        maxSourceItemNumber = value;
      }
    }
    let nextSyntheticItemNumber = maxSourceItemNumber + 1;

    const itemByNumber = new Map();
    const ticketItems = [];
    const ticketItemKeys = new Set();
    const blockerCounts = new Map();
    const warningCounts = new Map();
    const sourceCounts = new Map();
    const mappingReasonCounts = new Map();
    const targetSubcategoryCounts = new Map();
    const otherMappingCounts = new Map();
    const blockerSamples = [];
    const otherSamples = [];

    const addTicketItem = (ticketNumber, itemNumber) => {
      if (!migratedTickets.has(ticketNumber)) {
        increment(warningCounts, "ticket_item skipped because ticket is not migrated");
        return;
      }
      if (!itemByNumber.has(itemNumber)) {
        increment(warningCounts, "ticket_item skipped because item is not migrated");
        return;
      }
      const key = `${ticketNumber}:${itemNumber}`;
      if (ticketItemKeys.has(key)) return;
      ticketItemKeys.add(key);
      ticketItems.push({ ticket_number: ticketNumber, item_number: itemNumber });
    };

    for (const row of wcRows) {
      const legacyItemNumber = parseNumber(row.WC400ITEMNO);
      const syntheticItemNumber =
        Number.isSafeInteger(legacyItemNumber) && legacyItemNumber > 0
          ? undefined
          : nextSyntheticItemNumber++;
      const item = mapLegacyItem(
        row,
        "WC400",
        "WC400INVEN",
        context,
        syntheticItemNumber,
      );
      if (syntheticItemNumber) {
        increment(warningCounts, "synthetic item number generated for invalid WC400 item number");
      }
      if (itemByNumber.has(item.item_number)) {
        increment(warningCounts, "duplicate WC400 item number skipped after first row");
        continue;
      }
      itemByNumber.set(item.item_number, item);
      addTicketItem(item.ticket_number, item.item_number);
      increment(sourceCounts, "WC400INVEN item");
      increment(mappingReasonCounts, item.category_reason);
      increment(targetSubcategoryCounts, `${item.category_name} / ${item.subcategory_name}`);
      if (item.category_name === "OTHER" || item.subcategory_name === "other") {
        increment(otherMappingCounts, `${item.legacy_category} / ${item.legacy_subcategory} -> ${item.category_name} / ${item.subcategory_name}`);
        samplePush(otherSamples, `WC400 item ${item.item_number}: ${item.legacy_category} / ${item.legacy_subcategory}`);
      }
    }

    for (const row of saRows) {
      const legacyItemNumber = parseNumber(row.SA110ITEMNO);
      const syntheticItemNumber =
        Number.isSafeInteger(legacyItemNumber) && legacyItemNumber > 0
          ? undefined
          : nextSyntheticItemNumber++;
      const item = mapLegacyItem(
        row,
        "SA110",
        "SA110ITEM",
        context,
        syntheticItemNumber,
      );
      if (syntheticItemNumber) {
        increment(warningCounts, "synthetic item number generated for invalid SA110 item number");
      }
      if (!itemByNumber.has(item.item_number)) {
        itemByNumber.set(item.item_number, item);
        increment(sourceCounts, "SA110ITEM item fallback");
        increment(mappingReasonCounts, item.category_reason);
        increment(targetSubcategoryCounts, `${item.category_name} / ${item.subcategory_name}`);
        if (item.category_name === "OTHER" || item.subcategory_name === "other") {
          increment(otherMappingCounts, `${item.legacy_category} / ${item.legacy_subcategory} -> ${item.category_name} / ${item.subcategory_name}`);
          samplePush(otherSamples, `SA110 item ${item.item_number}: ${item.legacy_category} / ${item.legacy_subcategory}`);
        }
      }
      addTicketItem(item.ticket_number, item.item_number);
    }

    const items = [...itemByNumber.values()];
    for (const item of items) {
      if (item.quantity_defaulted) increment(warningCounts, "quantity defaulted to 1");
      if (item.description_defaulted) increment(warningCounts, "description defaulted to Unknown item");
      if (item.amount_defaulted) increment(warningCounts, "amount defaulted to 0");
      if (!item.subcategory_id) {
        increment(blockerCounts, "mapped subcategory missing target id");
        samplePush(blockerSamples, `${item.item_number}: ${item.category_name} / ${item.subcategory_name}`);
      }
    }

    await client.query("BEGIN");
    if (shouldCommit && !blockerCounts.size) {
      await client.query("TRUNCATE TABLE ticket_item, item RESTART IDENTITY CASCADE");
      await insertBatches(
        client,
        "item",
        [
          "item_number",
          "quantity",
          "subcategory_id",
          "description",
          "brand_name",
          "model_number",
          "serial_number",
          "amount",
          "image_path",
        ],
        items,
      );
      await insertBatches(
        client,
        "ticket_item",
        ["ticket_number", "item_number"],
        ticketItems,
      );
      await client.query(
        "SELECT setval(pg_get_serial_sequence('item', 'item_number'), (SELECT MAX(item_number) FROM item))",
      );
    }
    if (shouldCommit && blockerCounts.size) {
      throw new Error("Item migration has blockers; not committing");
    }
    if (shouldCommit) await client.query("COMMIT");
    else await client.query("ROLLBACK");

    const targetCountResult = shouldCommit
      ? await pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM item) AS items,
            (SELECT COUNT(*)::int FROM ticket_item) AS ticket_items
        `)
      : { rows: [{ items: 0, ticket_items: 0 }] };

    const report = `# Item Migration

Generated: ${new Date().toISOString()}

Sources: \`WC400INVEN\` and \`SA110ITEM\` in \`superpawnconv.mdb\`

Target database: \`${dbConfig.database}\`

Mode: ${shouldCommit ? "commit" : "preview"}

## Summary

| Metric | Count |
| --- | ---: |
| WC400INVEN rows | ${wcRows.length.toLocaleString()} |
| SA110ITEM rows | ${saRows.length.toLocaleString()} |
| Items prepared | ${items.length.toLocaleString()} |
| Ticket-item links prepared | ${ticketItems.length.toLocaleString()} |
| Target item rows after commit | ${Number(targetCountResult.rows[0].items).toLocaleString()} |
| Target ticket_item rows after commit | ${Number(targetCountResult.rows[0].ticket_items).toLocaleString()} |
| Blocker types | ${blockerCounts.size.toLocaleString()} |

## Rules

- Use \`WC400INVEN\` as the primary item source.
- Add \`SA110ITEM\` rows only when their item number does not exist in \`WC400INVEN\`.
- Build \`ticket_item\` links from \`SA110ITEM\`, skipping tickets that were not migrated.
- Generate new item numbers for legacy rows where item number is blank, zero, or invalid.
- Default quantity to \`1\` when the legacy value is blank, zero, or invalid.
- Default blank descriptions to \`${UNKNOWN_DESCRIPTION}\`.
- Map legacy subcategories using \`category-migration.md\`; fall back to parent category and then \`OTHER / other\`.

## Blockers

${formatCounts(blockerCounts)}

### Blocker Samples

${formatSamples(blockerSamples)}

## Item Source Counts

${formatCounts(sourceCounts)}

## Mapping Reasons

${formatCounts(mappingReasonCounts)}

## Top Target Subcategories

${formatCounts(targetSubcategoryCounts, 80)}

## Top Other Mappings To Review

${formatCounts(otherMappingCounts, 80)}

### Other Mapping Samples

${formatSamples(otherSamples)}

## Warnings

${formatCounts(warningCounts, 80)}
`;

    fs.writeFileSync(reportPath, report);
    console.log(`Item migration ${shouldCommit ? "committed" : "previewed"}`);
    console.log(`Items prepared: ${items.length.toLocaleString()}`);
    console.log(`Ticket-item links prepared: ${ticketItems.length.toLocaleString()}`);
    console.log(`Blocker types: ${blockerCounts.size}`);
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
