const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const source = fs
  .readFileSync(path.join(__dirname, "migrate-ticket.cjs"), "utf8")
  .split("const main = async () => {")[0];
const parse = (content) =>
  vm.runInNewContext(
    source + "\nloadLocationMapping();",
    {
      __dirname,
      process,
      console,
      require: (name) =>
        name === "fs" ? { ...fs, readFileSync: () => content } : require(name),
    },
    { timeout: 5000 },
  );
const rules = [
  { legacy_location: " old1 ", mapped_location: "aa11" },
  { legacy_location: "OLD2", mapped_location: "UNKNOWN" },
];
const mapping = JSON.stringify(rules, null, 2);

test("reads JSON location rules with Windows or Linux line endings", () => {
  for (const content of [mapping, mapping.replace(/\n/g, "\r\n")]) {
    const result = parse(content);
    assert.equal(result.size, 2);
    assert.equal(result.get("OLD1"), "AA11");
    assert.equal(result.get("OLD2"), "UNKNOWN");
  }
});
test("rejects empty location rules", () => {
  assert.throws(() => parse("[]"), /rules were not loaded/);
});
test("rejects conflicting normalized locations but permits identical duplicates", () => {
  assert.throws(
    () =>
      parse(
        JSON.stringify([
          ...rules,
          { legacy_location: "OLD1", mapped_location: "AA12" },
        ]),
      ),
    /Conflicting rules/,
  );
  assert.equal(parse(JSON.stringify([...rules, rules[0]])).size, 2);
});
test("rejects metadata, missing fields, empty values and malformed JSON", () => {
  for (const rule of [
    null,
    {},
    { legacy_location: "x", mapped_location: "" },
    { legacy_location: "x", mapped_location: 123 },
    { legacy_location: "x", mapped_location: "y", count: 123 },
  ]) {
    assert.throws(
      () => parse(JSON.stringify([rule])),
      /only legacy_location and mapped_location/,
    );
  }
  assert.throws(() => parse("{}"), /must be an array/);
  assert.throws(() => parse("{broken"), /JSON|property/i);
});

const helpers = () =>
  vm.runInNewContext(
    source + "\n({ parseLegacyTime, combineDateTime, dbConfig });",
    { __dirname, process, console, require },
    { timeout: 5000 },
  );

test("reads unmarked 1:00-8:59 times as PM and keeps the rest", () => {
  const { parseLegacyTime, combineDateTime } = helpers();
  const cases = [
    ["1:19:31", "13:19:31"],
    ["04:39:03", "16:39:03"],
    ["8:59:59", "20:59:59"],
    ["9:53:01", "09:53:01"],
    ["12:28:36", "12:28:36"],
    ["17:09:14", "17:09:14"],
    ["00:20:33", "00:20:33"],
    ["1:01:55 PM", "13:01:55"],
    ["10:09:02 AM", "10:09:02"],
    ["12:05:00 AM", "00:05:00"],
  ];
  for (const [raw, expected] of cases) {
    assert.equal(parseLegacyTime(raw).value, expected, raw);
  }
  // Only the shifted times are flagged, so the report can count them.
  assert.equal(parseLegacyTime("1:19:31").inferredPm, true);
  assert.equal(parseLegacyTime("9:53:01").inferredPm, false);
  assert.equal(parseLegacyTime("1:01:55 PM").inferredPm, false);
  assert.equal(combineDateTime("10/29/2026", "2:17:56").inferredPm, true);
});

test("imports in the shop time zone so zoneless values mean Regina time", () => {
  // Capture what the script hands to pg's Pool instead of connecting.
  let poolConfig;
  const fakePg = {
    Pool: class {
      constructor(config) {
        poolConfig = config;
      }
    },
  };
  const { createPool, combineDateTime } = vm.runInNewContext(
    source + "\n({ createPool, combineDateTime });",
    {
      __dirname,
      process,
      console,
      require: (name) => (name === "pg" ? fakePg : require(name)),
    },
    { timeout: 5000 },
  );
  createPool();
  assert.equal(poolConfig.options, "-c timezone=America/Regina");
  assert.equal(
    combineDateTime("10/29/2026", "2:17:56").value,
    "2026-10-29 14:17:56",
  );
});
