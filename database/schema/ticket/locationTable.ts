export const createLocationTable = `
  CREATE TABLE IF NOT EXISTS location (
    id SERIAL PRIMARY KEY,
    location TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT location_uppercase CHECK (location = UPPER(location))
  );
`;
