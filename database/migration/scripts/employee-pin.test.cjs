const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  readEmployeePinSecret,
  hashEmployeePin,
} = require("./employee-pin.cjs");

const secret = "a".repeat(32);

test("hashes trimmed PINs deterministically with the secret", () => {
  const hash = hashEmployeePin(" 1234 ", secret);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, hashEmployeePin("1234", secret));
  assert.notEqual(hash, hashEmployeePin("1235", secret));
  assert.notEqual(hash, hashEmployeePin("1234", "b".repeat(32)));
  assert.ok(!hash.includes("1234"));
});

test("rejects empty PINs", () => {
  assert.throws(() => hashEmployeePin("  ", secret), /PIN is empty/);
  assert.throws(() => hashEmployeePin(undefined, secret), /PIN is empty/);
});

test("requires a secret of at least 32 characters", () => {
  assert.equal(readEmployeePinSecret({ EMPLOYEE_PIN_SECRET: secret }), secret);
  assert.throws(() => readEmployeePinSecret({}), /EMPLOYEE_PIN_SECRET/);
  assert.throws(
    () => readEmployeePinSecret({ EMPLOYEE_PIN_SECRET: "short" }),
    /EMPLOYEE_PIN_SECRET/,
  );
});
