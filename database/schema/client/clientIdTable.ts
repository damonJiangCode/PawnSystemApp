export const createClientIDTable = `
  CREATE TABLE IF NOT EXISTS client_id (
    id SERIAL PRIMARY KEY,
    client_number INTEGER NOT NULL REFERENCES client(client_number) ON DELETE CASCADE,
    id_type TEXT NOT NULL REFERENCES id_type(type),
    id_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );
`;
