import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

export type ItemCategoryRecord = {
  category_id: number;
  category_name: string;
  is_active: boolean;
};
export type ItemSubcategoryRecord = {
  subcategory_id: number;
  category_id: number;
  subcategory_name: string;
  is_active: boolean;
};
type CreateSubcategoryResult =
  | { value: ItemSubcategoryRecord }
  | {
      error: 'category-not-found' | 'category-inactive' | 'subcategory-exists';
    };

@Injectable()
export class ItemCategoryRepository {
  constructor(private readonly pool: Pool) {}

  async loadItemCategories() {
    const result = await this.pool.query<{
      category_id: number;
      category_name: string;
      subcategory_id: number;
      subcategory_name: string;
    }>(`SELECT c.id AS category_id, c.name AS category_name,
               s.id AS subcategory_id, s.name AS subcategory_name
        FROM item_subcategory s
        INNER JOIN item_category c ON c.id = s.category_id
        WHERE c.is_active = TRUE AND s.is_active = TRUE
        ORDER BY c.name ASC, s.name ASC`);
    return result.rows;
  }

  async loadAllItemCategories() {
    const result = await this.pool.query<
      ItemCategoryRecord & {
        subcategory_id: number | null;
        subcategory_name: string | null;
        subcategory_is_active: boolean | null;
      }
    >(`SELECT c.id AS category_id, c.name AS category_name, c.is_active,
               s.id AS subcategory_id, s.name AS subcategory_name,
               s.is_active AS subcategory_is_active
        FROM item_category c
        LEFT JOIN item_subcategory s ON s.category_id = c.id
        ORDER BY c.name ASC, s.name ASC`);
    const categories = new Map<
      number,
      ItemCategoryRecord & { subcategories: ItemSubcategoryRecord[] }
    >();
    for (const row of result.rows) {
      let category = categories.get(row.category_id);
      if (!category) {
        category = {
          category_id: row.category_id,
          category_name: row.category_name,
          is_active: row.is_active,
          subcategories: [],
        };
        categories.set(row.category_id, category);
      }
      if (row.subcategory_id !== null)
        category.subcategories.push({
          subcategory_id: row.subcategory_id,
          category_id: row.category_id,
          subcategory_name: row.subcategory_name!,
          is_active: row.subcategory_is_active!,
        });
    }
    return [...categories.values()];
  }

  async addItemCategory(name: string) {
    const result = await this.pool.query<ItemCategoryRecord>(
      `INSERT INTO item_category (name) VALUES ($1) ON CONFLICT DO NOTHING
       RETURNING id AS category_id, name AS category_name, is_active`,
      [name],
    );
    return result.rows[0] ?? null;
  }

  async addItemSubcategory(
    categoryId: number,
    name: string,
  ): Promise<CreateSubcategoryResult> {
    // The parent check and insert are one statement, so no transaction is needed.
    const result = await this.pool.query<ItemSubcategoryRecord>(
      `INSERT INTO item_subcategory (category_id, name)
       SELECT id, $2 FROM item_category WHERE id = $1 AND is_active
       ON CONFLICT DO NOTHING
       RETURNING id AS subcategory_id, category_id, name AS subcategory_name, is_active`,
      [categoryId, name],
    );
    if (result.rows[0]) return { value: result.rows[0] };
    const parent = await this.pool.query<{ is_active: boolean }>(
      'SELECT is_active FROM item_category WHERE id = $1',
      [categoryId],
    );
    if (!parent.rows[0]) return { error: 'category-not-found' };
    if (!parent.rows[0].is_active) return { error: 'category-inactive' };
    return { error: 'subcategory-exists' };
  }

  async setItemCategoryActive(id: number, isActive: boolean) {
    const result = await this.pool.query<ItemCategoryRecord>(
      `UPDATE item_category SET is_active = $1 WHERE id = $2
       RETURNING id AS category_id, name AS category_name, is_active`,
      [isActive, id],
    );
    return result.rows[0] ?? null;
  }

  async setItemSubcategoryActive(id: number, isActive: boolean) {
    const result = await this.pool.query<ItemSubcategoryRecord>(
      `UPDATE item_subcategory SET is_active = $1 WHERE id = $2
       RETURNING id AS subcategory_id, category_id, name AS subcategory_name, is_active`,
      [isActive, id],
    );
    return result.rows[0] ?? null;
  }
}
