export const createEmployeeTable = `
  CREATE TABLE IF NOT EXISTS employee (
    employee_number SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    nickname TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL,
    password TEXT NOT NULL UNIQUE,
    is_terminated BOOLEAN NOT NULL DEFAULT FALSE,
    is_manager BOOLEAN NOT NULL DEFAULT FALSE,
    address TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;
