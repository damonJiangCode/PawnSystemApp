export const createIDTypeTable = `
  CREATE TABLE IF NOT EXISTS id_type (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
  );
  CREATE UNIQUE INDEX IF NOT EXISTS id_type_type_case_insensitive_idx
    ON id_type (LOWER(type));
`;
