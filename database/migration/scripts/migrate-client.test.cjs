const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

// Load helpers only: never run Access exports, migration main(), or database writes.
const source = fs
  .readFileSync(path.join(__dirname, "migrate-client.cjs"), "utf8")
  .split("const main = async () => {")[0];
const { insertClients } = vm.runInNewContext(
  source + "\n({ insertClients });",
  {
    __dirname,
    process: { env: {}, argv: [] },
    console,
    require,
  },
);

test("migration starts ordinary and fallback clients active with no hold", async () => {
  const calls = [];
  await insertClients(
    { query: async (sql, values) => calls.push({ sql, values }) },
    [
      { client_number: 1, first_name: "TEST", last_name: "CLIENT" },
      { client_number: 2, first_name: "Unknown", last_name: "Legacy Client" },
    ],
  );
  assert.equal(calls.length, 1);
  const { sql, values } = calls[0];
  const columns = sql.match(/INSERT INTO client \(([^)]+)\)/)[1].split(",");
  assert.equal(columns.includes("hold_until"), false);
  const activeIndex = columns.indexOf("is_active");
  assert.ok(activeIndex >= 0);
  assert.equal(values[activeIndex], true);
  assert.equal(values[columns.length + activeIndex], true);
  assert.equal(values.length, columns.length * 2);
  assert.equal(values[0], 1);
  assert.equal(values[columns.length], 2);
  assert.equal((sql.match(/\$\d+/g) ?? []).length, values.length);
  // The database supplies NULL when this nullable, default-free column is omitted.
  const schema = fs.readFileSync(
    path.join(
      __dirname,
      "../../schema/client/clientTable.ts",
    ),
    "utf8",
  );
  assert.match(schema, /hold_until DATE\s*,/);
  assert.match(schema, /is_active BOOLEAN NOT NULL DEFAULT TRUE\s*,/);
});
