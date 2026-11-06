export const createEyeColorTable = `CREATE TABLE IF NOT EXISTS eye_color(
  id SERIAL PRIMARY KEY,
  color TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT eye_color_uppercase CHECK (color = UPPER(color))
);
`;
