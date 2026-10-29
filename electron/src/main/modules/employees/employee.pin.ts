import { createHmac } from "node:crypto";

const MIN_SECRET_LENGTH = 32;

// Same algorithm as server/src/employee/employee-pin.hasher.ts and
// database/migration/scripts/employee-pin.cjs. Read on use because the root
// .env is loaded by database/connection.ts.
export const hashEmployeePin = (pin: string) => {
  const secret = process.env.EMPLOYEE_PIN_SECRET?.trim() ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `Set EMPLOYEE_PIN_SECRET (at least ${MIN_SECRET_LENGTH} characters).`,
    );
  }
  return createHmac("sha256", secret).update(pin.trim()).digest("hex");
};
