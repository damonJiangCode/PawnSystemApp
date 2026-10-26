import type { Item } from "../../../../shared/models/item.model";
import type {
  ItemSearchInput,
  ItemCategoryOption,
  SaveItemInput,
} from "../../../../shared/payload-contracts/item.contract";
import { getAppApi } from "../../shared/api/app.api";

let categoryCache: ItemCategoryOption[] | null = null;
let categoryPromise: Promise<ItemCategoryOption[]> | null = null;

export const itemApi = {
  loadItems: async (ticketNumber?: number): Promise<Item[]> => {
    if (!ticketNumber) {
      return [];
    }

    const api = getAppApi()?.item;
    if (!api) {
      throw new Error("Item API is unavailable.");
    }

    return api.loadItemsByTicket(ticketNumber);
  },

  preloadCategories: async (): Promise<ItemCategoryOption[]> => {
    if (categoryCache) {
      return categoryCache;
    }

    if (categoryPromise) {
      return categoryPromise;
    }

    const api = getAppApi()?.item;
    if (!api) {
      throw new Error("Item API is unavailable.");
    }

    categoryPromise = api
      .loadItemCategories()
      .then((categories) => {
        categoryCache = categories;
        return categories;
      })
      .finally(() => {
        categoryPromise = null;
      });

    return categoryPromise;
  },

  searchItems: async (input: ItemSearchInput): Promise<Item[]> => {
    const api = getAppApi()?.item;
    if (!api) {
      throw new Error("Item API is unavailable.");
    }

    return api.searchItems({
      client_number: input.client_number,
      item_number: input.item_number ? Number(input.item_number) : undefined,
      category_id: input.category_id ? Number(input.category_id) : undefined,
      subcategory_id: input.subcategory_id
        ? Number(input.subcategory_id)
        : undefined,
      brand_name: input.brand_name?.trim() ?? "",
      model_number: input.model_number?.trim() ?? "",
      serial_number: input.serial_number?.trim() ?? "",
    });
  },

  createItem: async (payload: SaveItemInput): Promise<Item> => {
    const api = getAppApi()?.item;
    if (!api) {
      throw new Error("Item API is unavailable.");
    }

    return api.createItem(payload);
  },

  updateItem: async (payload: SaveItemInput): Promise<Item> => {
    const api = getAppApi()?.item;
    if (!api) {
      throw new Error("Item API is unavailable.");
    }

    return api.updateItem(payload);
  },

  deleteItem: async (
    ticketNumber: number,
    itemNumber: number,
  ): Promise<void> => {
    const api = getAppApi()?.item;
    if (!api) {
      throw new Error("Item API is unavailable.");
    }

    return api.deleteItem(ticketNumber, itemNumber);
  },

  linkItemsToTicket: async (
    ticketNumber: number,
    itemNumbers: number[],
  ): Promise<Item[]> => {
    const api = getAppApi()?.item;
    if (!api) {
      throw new Error("Item API is unavailable.");
    }

    return api.linkItemsToTicket(ticketNumber, itemNumbers);
  },

  saveItemImage: async (fileName: string, base64: string): Promise<string> => {
    const api = getAppApi()?.item;
    if (!api) {
      throw new Error("Item API is unavailable.");
    }

    return api.saveItemImage(fileName, base64);
  },
};

export type { ItemCategoryOption, ItemSearchInput, SaveItemInput };
