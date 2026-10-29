import assert from "node:assert/strict";
import test from "node:test";
import { hashEmployeePin } from "./employee.pin.ts";

// Test vector from database/migration/scripts/employee-pin.cjs:
// hashEmployeePin("1234", "e".repeat(32)).
const EXPECTED =
  "b49d1afbd12a9afe30adc6b9dd620acfc126fb26ac6ccddf1c57b909cf20dc2e";

test("matches the migration hash and rejects a weak secret", (t) => {
  const previous = process.env.EMPLOYEE_PIN_SECRET;
  t.after(() => {
    if (previous === undefined) delete process.env.EMPLOYEE_PIN_SECRET;
    else process.env.EMPLOYEE_PIN_SECRET = previous;
  });

  process.env.EMPLOYEE_PIN_SECRET = "e".repeat(32);
  assert.equal(hashEmployeePin(" 1234 "), EXPECTED);

  process.env.EMPLOYEE_PIN_SECRET = "short";
  assert.throws(() => hashEmployeePin("1234"), /EMPLOYEE_PIN_SECRET/);
});
