import assert from "node:assert/strict";
import test from "node:test";
import { resolveFormFieldError } from "./formError.ts";

const fieldError = (field: string, message: string) =>
  Object.assign(new Error(message), { field });

test("uses the error's field property instead of matching message text", () => {
  const passwordError = fieldError(
    "employee_password",
    "Employee password is incorrect.",
  );
  assert.equal(
    resolveFormFieldError("employee_password", passwordError),
    "No employee was found for that password.",
  );
  assert.equal(resolveFormFieldError("location", passwordError), null);

  // The text mentions "location", but the error belongs to amount.
  const amountError = fieldError("amount", "Amount must be greater than 0.");
  assert.equal(resolveFormFieldError("location", amountError), null);
});

test("errors without a field still fall back to matching the message", () => {
  assert.equal(
    resolveFormFieldError(
      "employee_password",
      new Error("Employee password is required."),
    ),
    "Enter employee password.",
  );
});
