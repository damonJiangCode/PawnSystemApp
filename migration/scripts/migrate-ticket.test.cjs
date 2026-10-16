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
const mapping =
  "# Conversion rules\n\n| legacy_location | mapped_location |\n| --- | --- |\n| OLD1 | AA11 |\n| OLD2 | UNKNOWN |\n";

test("reads public two-column location rules with Windows or Linux line endings", () => {
  for (const content of [mapping, mapping.replace(/\n/g, "\r\n")]) {
    const result = parse(content);
    assert.equal(result.size, 2);
    assert.equal(result.get("OLD1"), "AA11");
    assert.equal(result.get("OLD2"), "UNKNOWN");
  }
});
test("rejects empty location rules", () => {
  assert.throws(() => parse("# No rules"), /rules were not loaded/);
});
test("rejects conflicting rules for the same legacy location", () => {
  assert.throws(
    () => parse(mapping + "| OLD1 | AA12 |\n"),
    /Conflicting rules/,
  );
});
test("rejects extra metadata columns instead of treating them as conversion rules", () => {
  assert.throws(
    () => parse(mapping + "| OLD3 | AA13 | 123 |\n"),
    /only legacy_location and mapped_location/,
  );
});
