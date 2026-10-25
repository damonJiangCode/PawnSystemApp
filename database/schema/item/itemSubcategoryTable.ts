export const createItemSubcategoryTable = `
  CREATE TABLE IF NOT EXISTS item_subcategory (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES item_category(id),
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT item_subcategory_category_name_unique UNIQUE (category_id, name)
  );
`;
