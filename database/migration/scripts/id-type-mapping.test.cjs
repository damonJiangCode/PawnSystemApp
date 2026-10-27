const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const { loadIdTypeMapping, resolveIdType } = require("./id-type-mapping.cjs");
const file = path.join(__dirname, "../mappings/id-type-mapping.json");
const read = () => JSON.parse(fs.readFileSync(file, "utf8"));

function fixture(t, doc) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "id-mapping-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const target = path.join(dir, "mapping.json");
  fs.writeFileSync(target, typeof doc === "string" ? doc : JSON.stringify(doc));
  return target;
}

test("normalizes codes, preserves canonical mappings and explicitly resolves blank code", () => {
  const map = loadIdTypeMapping();
  assert.equal(resolveIdType(map, " drl ").mapped_type, "Driver's License");
  assert.equal(resolveIdType(map, "").mapped_type, "Other");
  assert.equal(resolveIdType(map, "OTH").mapped_type, "Other");
  assert.equal(map.rules.size, 29);
});

test("preserves legacy codes with distinct inactive targets rather than collapsing them to Other", () => {
  const map = loadIdTypeMapping();
  const legacyCodes = ["BAR", "CAS", "CIB", "CRE", "LIB", "M/M", "REM", "ROY"];
  const names = new Set();
  for (const code of legacyCodes) {
    const rule = resolveIdType(map, code);
    assert.equal(rule.action, "map");
    assert.notEqual(rule.mapped_type, "Other");
    assert.match(
      rule.mapped_type,
      new RegExp(`^Legacy ${code.replace("/", "\\/")}: `),
    );
    assert.equal(
      map.targetTypes.find((t) => t.type === rule.mapped_type).is_active,
      false,
    );
    names.add(rule.mapped_type);
  }
  assert.equal(names.size, 8);
});

test("PHO and unknown codes require review and never silently map to Other", () => {
  const map = loadIdTypeMapping();
  for (const code of ["PHO", "new-code"]) {
    const rule = resolveIdType(map, code);
    assert.equal(rule.action, "review");
    assert.equal(rule.mapped_type, null);
    assert.ok(rule.reason);
  }
});

test("rejects duplicate normalized codes, missing targets, unresolved mappings and draft inputs", (t) => {
  const examples = [];
  let doc = read();
  doc.rules.push({
    ...doc.rules.find((r) => r.legacy_code === "DRL"),
    legacy_code: " drl ",
  });
  examples.push(doc);
  doc = read();
  doc.rules.find((r) => r.legacy_code === "DRL").mapped_type = "Missing";
  examples.push(doc);
  doc = read();
  doc.rules.find((r) => r.legacy_code === "DRL").requires_review = true;
  examples.push(doc);
  doc = read();
  doc.target_types.push({
    ...doc.target_types[0],
    type: doc.target_types[0].type.toUpperCase(),
  });
  examples.push(doc);
  doc = read();
  doc.status = "draft_for_review";
  examples.push(doc);
  doc = read();
  doc.rules = doc.rules.filter((r) => r.legacy_code !== "");
  examples.push(doc);
  doc = read();
  doc.rules.find((r) => r.legacy_code === "PHO").action = "skip";
  examples.push(doc);
  for (const example of examples)
    assert.throws(() => loadIdTypeMapping(fixture(t, example)));
  assert.throws(() => loadIdTypeMapping(fixture(t, "{broken")));
});

test("accepts Windows JSON line endings", (t) => {
  assert.equal(
    loadIdTypeMapping(
      fixture(t, JSON.stringify(read(), null, 2).replace(/\n/g, "\r\n")),
    ).rules.size,
    29,
  );
});

test("seed uses the same targets and never resets existing type activation", async () => {
  const ts = require("typescript");
  const source = fs.readFileSync(
    path.join(__dirname, "../../seed/clientSeeds.ts"),
    "utf8",
  );
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      __dirname: path.join(__dirname, "../../seed"),
      require: (name) =>
        name === "../migration/scripts/id-type-mapping.cjs"
          ? { loadIdTypeMapping }
          : require(name),
    },
  );
  let query;
  await exports.seedIdTypes({
    query: async (sql, values) => (query = { sql, values }),
  });
  assert.match(query.sql, /ON CONFLICT \(type\) DO NOTHING/);
  assert.doesNotMatch(query.sql, /DO UPDATE/);
  const target = loadIdTypeMapping().targetTypes;
  assert.deepEqual(
    Array.from(query.values[0]),
    target.map((t) => t.type),
  );
  assert.deepEqual(
    Array.from(query.values[1]),
    target.map((t) => t.is_active),
  );
});
