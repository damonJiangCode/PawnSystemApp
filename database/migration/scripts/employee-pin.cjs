const crypto = require("node:crypto");

const MIN_SECRET_LENGTH = 32;

function readEmployeePinSecret(env = process.env) {
  const secret = String(env.EMPLOYEE_PIN_SECRET ?? "").trim();
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `Set EMPLOYEE_PIN_SECRET (at least ${MIN_SECRET_LENGTH} characters) in private environment configuration.`,
    );
  }
  return secret;
}

function hashEmployeePin(pin, secret) {
  const value = String(pin ?? "").trim();
  if (!value) throw new Error("Employee PIN is empty.");
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

module.exports = { MIN_SECRET_LENGTH, readEmployeePinSecret, hashEmployeePin };
