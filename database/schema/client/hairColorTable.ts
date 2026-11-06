export const createHairColorTable = `CREATE TABLE IF NOT EXISTS hair_color(
  id SERIAL PRIMARY KEY,
  color TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT hair_color_uppercase CHECK (color = UPPER(color))
);
`;
