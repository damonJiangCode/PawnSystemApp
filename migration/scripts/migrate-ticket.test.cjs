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
