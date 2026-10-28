export type ItemCategory = {
  category_id: number;
  category_name: string;
  is_active: boolean;
};

export type ItemSubcategory = {
  subcategory_id: number;
  category_id: number;
  subcategory_name: string;
  is_active: boolean;
};

export type ItemCategoryTree = ItemCategory & {
  subcategories: ItemSubcategory[];
};
