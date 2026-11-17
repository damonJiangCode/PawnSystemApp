import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCategoryMappings } from "./migrate-item.js";

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
const parse = (content) => parseCategoryMappings(content);
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
