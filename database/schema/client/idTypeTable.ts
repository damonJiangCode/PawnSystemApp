export const createIDTypeTable = `
  CREATE TABLE IF NOT EXISTS id_type (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL UNIQUE
  );
`;
