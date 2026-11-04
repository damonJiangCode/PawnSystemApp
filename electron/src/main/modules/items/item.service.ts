import type { Item } from "../../../../../shared/models/item.model.ts";
import { itemRepo } from "./item.repo.ts";
import { runInTransaction } from "../../shared/runInTransaction.ts";
import { itemInput } from "./item.input.ts";

export const itemService = {
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
};
