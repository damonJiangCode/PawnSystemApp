import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { insertClients } from "./migrate-client.js";

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
    path.join(import.meta.dirname, "../../schema/client/clientTable.ts"),
    "utf8",
  );
  assert.match(schema, /hold_until DATE\s*,/);
  assert.match(schema, /is_active BOOLEAN NOT NULL DEFAULT TRUE\s*,/);
});
