import type { Item } from "../../../shared/models/item.model.ts";
import type {
  ItemSearchInput,
  ItemCategoryOption,
  SaveItemInput,
} from "../../../shared/payload-contracts/item.contract.ts";
import { itemRepo } from "./item.repo.ts";
import { runInTransaction } from "../../shared/runInTransaction.ts";
import { imageStorage } from "../../shared/imageStorage.ts";
import { itemInput } from "./item.input.ts";

export const itemService = {
  loadItems: async (ticketNumber: number): Promise<Item[]> => {
    if (!ticketNumber) {
      return [];
    }

    return itemRepo.loadByTicketNumber(ticketNumber);
  },

  loadItemCategories: async (): Promise<ItemCategoryOption[]> => {
    return itemRepo.loadCategories();
  },

  searchItems: async (input: ItemSearchInput): Promise<Item[]> => {
    const normalizedInput = itemInput.normalizeItemSearch(input);

    if (
      normalizedInput.client_number !== undefined &&
      (!Number.isSafeInteger(normalizedInput.client_number) ||
        normalizedInput.client_number <= 0)
    ) {
      throw new Error("Select a valid client.");
    }

    if (
      normalizedInput.item_number &&
      (!Number.isFinite(normalizedInput.item_number) ||
        normalizedInput.item_number <= 0)
    ) {
      throw new Error("Enter a valid item number.");
    }

    return itemRepo.search(normalizedInput);
  },

  createItem: async (input: SaveItemInput): Promise<Item> => {
    const normalizedInput = itemInput.normalizeSaveItem(input);
    itemInput.validateItem(normalizedInput);

    return runInTransaction("createItem", async (client) => {
      const item = await itemRepo.create(normalizedInput, client);
      const imagePath = item.image_path
        ? await imageStorage.finalizeItemImage(
            item.item_number,
            item.image_path,
          )
        : "";

      if (imagePath && imagePath !== item.image_path) {
        await itemRepo.updateImagePath(item.item_number, imagePath, client);
      }

      return {
        ...item,
        image_path: imagePath || item.image_path,
      };
    });
  },

  updateItem: async (input: SaveItemInput): Promise<Item> => {
    const normalizedInput = itemInput.normalizeSaveItem(input);
    itemInput.validateItem(normalizedInput);

    if (!normalizedInput.item_number) {
      throw new Error("An item is required.");
    }

    return runInTransaction("updateItem", async (client) => {
      const imagePath = normalizedInput.image_path
        ? await imageStorage.finalizeItemImage(
            normalizedInput.item_number as number,
            normalizedInput.image_path,
          )
        : "";
      const preparedInput = {
        ...normalizedInput,
        image_path: imagePath || normalizedInput.image_path,
      };

      return itemRepo.update(preparedInput, client);
    });
  },

  deleteItem: async (
    ticketNumber: number,
    itemNumber: number,
  ): Promise<void> => {
    if (!ticketNumber || !itemNumber) {
      throw new Error("A ticket and item are required.");
    }

    return runInTransaction("deleteItem", async (client) =>
      itemRepo.delete(Number(ticketNumber), Number(itemNumber), client),
    );
  },

  linkItemsToTicket: async (
    ticketNumber: number,
    itemNumbers: number[],
  ): Promise<Item[]> => {
    const normalizedInput = itemInput.normalizeTicketItemNumbers(
      ticketNumber,
      itemNumbers,
    );

    if (
      !Number.isFinite(normalizedInput.ticketNumber) ||
      normalizedInput.ticketNumber <= 0
    ) {
      throw new Error("A ticket is required.");
    }

    if (!normalizedInput.itemNumbers.length) {
      return [];
    }

    return runInTransaction("linkItemsToTicket", async (client) => {
      const linkedItems: Item[] = [];

      for (const itemNumber of normalizedInput.itemNumbers) {
        const linkedItem = await itemRepo.linkItemToTicket(
          normalizedInput.ticketNumber,
          itemNumber,
          client,
        );
        linkedItems.push(linkedItem);
      }

      return linkedItems;
    });
  },

  saveItemImage: async (fileName: string, base64: string): Promise<string> => {
    return imageStorage.saveItemImage(fileName, base64);
  },
};
