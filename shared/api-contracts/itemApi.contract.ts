import type { Item } from "../models/item.model.ts";
import type {
  ItemCategory,
  ItemCategoryTree,
  ItemSubcategory,
} from "../models/item-category.model.ts";
import type {
  ItemCategoryOption,
  ItemSearchInput,
  SaveItemInput,
} from "../payload-contracts/item.contract.ts";

export type ItemApi = {
  loadItemsByTicket: (ticketNumber: number) => Promise<Item[]>;
  loadItemCategories: () => Promise<ItemCategoryOption[]>;
  loadAllItemCategories: () => Promise<ItemCategoryTree[]>;
  addItemCategory: (name: string) => Promise<ItemCategory>;
  addItemSubcategory: (
    categoryId: number,
    name: string,
  ) => Promise<ItemSubcategory>;
  setItemCategoryActive: (
    categoryId: number,
    isActive: boolean,
  ) => Promise<ItemCategory>;
  setItemSubcategoryActive: (
    subcategoryId: number,
    isActive: boolean,
  ) => Promise<ItemSubcategory>;
  searchItems: (input: ItemSearchInput) => Promise<Item[]>;
  createItem: (input: SaveItemInput) => Promise<Item>;
  updateItem: (input: SaveItemInput) => Promise<Item>;
  deleteItem: (ticketNumber: number, itemNumber: number) => Promise<void>;
  linkItemsToTicket: (
    ticketNumber: number,
    itemNumbers: number[],
  ) => Promise<Item[]>;
  saveItemImage: (fileName: string, base64: string) => Promise<string>;
};
