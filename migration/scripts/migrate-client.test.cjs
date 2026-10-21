const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

// Load helpers only: never run Access exports, migration main(), or database writes.
const source = fs
  .readFileSync(path.join(__dirname, "migrate-client.cjs"), "utf8")
  .split("const main = async () => {")[0];

function helpers(
  mapping = fs.readFileSync(
    path.join(__dirname, "../mappings/client-mapping.json"),
    "utf8",
  ),
  clock = "2030-01-02T02:00:00Z",
) {
  return vm.runInNewContext(
    source + "\n({ getMigrationHoldUntil, insertClients });",
    {
      __dirname,
      process: { env: {}, argv: [] },
      console,
      Date: class extends Date {
        constructor(value) {
          super(value === undefined ? clock : value);
        }
      },
      require: (name) =>
        name === "fs"
          ? {
              readFileSync: () => {
                if (mapping === null) throw new Error("Mapping file missing");
                return mapping;
              },
            }
          : require(name),
    },
  );
}

test("client hold date remains the fixed baseline regardless of execution date", () => {
  for (const clock of ["2026-10-21T02:00:00Z", "2030-01-02T02:00:00Z"]) {
    assert.equal(
      helpers(undefined, clock).getMigrationHoldUntil(),
      "2026-01-01",
    );
  }
});

test("missing or unsupported client mapping refuses to silently import NULL holds", () => {
  assert.throws(() => helpers(null).getMigrationHoldUntil(), /missing/);
  assert.throws(
    () => helpers("{}").getMigrationHoldUntil(),
    /mapping must use/,
  );
  assert.throws(
    () =>
      helpers(
        JSON.stringify({
          hold_until: { source: "migration_date", value: "America/Regina" },
        }),
      ).getMigrationHoldUntil(),
    /mapping must use/,
  );
});

test("client batch INSERT includes the mapped date for ordinary and fallback clients", async () => {
  const { getMigrationHoldUntil, insertClients } = helpers();
  const date = getMigrationHoldUntil();
  const calls = [];
  await insertClients(
    { query: async (sql, values) => calls.push({ sql, values }) },
    [
      { client_number: 1, first_name: "TEST", hold_until: date },
      {
        client_number: 2,
        first_name: "Unknown",
        last_name: "Legacy Client",
        hold_until: date,
      },
    ],
  );
  assert.equal(calls.length, 1);
  const columns = calls[0].sql
    .match(/INSERT INTO client \(([^)]+)\)/)[1]
    .split(",");
  const index = columns.indexOf("hold_until");
  assert.ok(index >= 0);
  assert.equal(calls[0].values.length, columns.length * 2);
  assert.equal(calls[0].values[index], date);
  assert.equal(calls[0].values[columns.length + index], date);
});

test("fixed hold date rejects impossible calendar dates", () => {
  assert.throws(
    () =>
      helpers(
        JSON.stringify({
          hold_until: { source: "fixed_date", value: "2026-02-30" },
        }),
      ).getMigrationHoldUntil(),
    /valid calendar date/,
  );
});

test("JSON mapping handles CRLF whitespace", () => {
  const json = JSON.stringify(
    { hold_until: { source: "fixed_date", value: "2026-01-01" } },
    null,
    2,
  );
  assert.equal(
    helpers(json.replace(/\n/g, "\r\n")).getMigrationHoldUntil(),
    "2026-01-01",
  );
});

test("rejects malformed JSON and unexpected fields", () => {
  assert.throws(
    () => helpers("{broken").getMigrationHoldUntil(),
    /JSON|property/i,
  );
  for (const mapping of [
    null,
    [],
    { hold_until: null },
    { hold_until: { source: "fixed_date", value: "2026-01-01", extra: true } },
    { hold_until: { source: "fixed_date", value: "2026-01-01" }, extra: true },
  ]) {
    assert.throws(
      () => helpers(JSON.stringify(mapping)).getMigrationHoldUntil(),
      /mapping must use/,
    );
  }
});
