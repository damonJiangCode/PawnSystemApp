export const createItemCategoryTable = `
  CREATE TABLE IF NOT EXISTS item_category (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
  );
`;
