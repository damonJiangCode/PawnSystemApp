const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const script = fs
  .readFileSync(path.join(__dirname, "migrate-item.cjs"), "utf8")
  .split("const main = async () => {")[0];
// Fictional mapping rules keep this regression test independent of private mappings.
const rules = {
  subcategoryRules: [
    { source: "ring", category: "JEWELRY", subcategory: "ring" },
    ...["7777", "7779"].map((source) => ({
      source,
      category: "OTHER",
      subcategory: "other",
    })),
  ],
  parentRules: [
    { source: "TEST PARENT", category: "OTHER", subcategory: "other" },
  ],
};
const mapping = JSON.stringify(rules, null, 2);
function parse(content) {
  const context = {
    __dirname,
    process,
    console,
    require: (name) =>
      name === "fs" ? { ...fs, readFileSync: () => content } : require(name),
  };
  return vm.runInNewContext(script + "\nparseCategoryMappings();", context);
}
test("category JSON loads identically with Windows and Linux line endings", () => {
  const linux = parse(mapping.replace(/\r\n/g, "\n"));
  const windows = parse(mapping.replace(/\r?\n/g, "\r\n"));
  assert.equal(windows.subcategoryRules.size, linux.subcategoryRules.size);
  assert.equal(windows.parentRules.size, linux.parentRules.size);
  assert.ok(windows.subcategoryRules.size > 2);
  assert.ok(windows.parentRules.size > 0);
  assert.equal(windows.subcategoryRules.get("ring").category, "JEWELRY");
});
test("empty mapping document refuses an OTHER-only migration", () => {
  assert.throws(
    () => parse(JSON.stringify({ subcategoryRules: [], parentRules: [] })),
    /Category mapping rules were not loaded/,
  );
});

test("rejects conflicting normalized category sources and invalid structures", () => {
  const conflict = {
    ...rules,
    subcategoryRules: [
      ...rules.subcategoryRules,
      { source: "RING!", category: "OTHER", subcategory: "other" },
    ],
  };
  assert.throws(() => parse(JSON.stringify(conflict)), /Conflicting rules/);
  for (const value of [
    null,
    [],
    {},
    { ...rules, extra: true },
    {
      ...rules,
      parentRules: [{ source: "x", category: "", subcategory: "x" }],
    },
  ]) {
    assert.throws(() => parse(JSON.stringify(value)), /Category/);
  }
  assert.throws(() => parse("{broken"), /JSON|property/i);
  assert.throws(
    () =>
      parse(
        JSON.stringify({
          ...rules,
          subcategoryRules: rules.subcategoryRules.slice(0, 1),
        }),
      ),
    /7777 and 7779/,
  );
});
