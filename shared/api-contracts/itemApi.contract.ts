import type { Item } from "../models/item.model.ts";
import type {
  CreateItemInput,
  ItemSearchInput,
  ItemSearchResult,
  UpdateItemInput,
} from "../payload-contracts/item.contract.ts";

export type ItemApi = {
  loadItemsByTicket: (ticketNumber: number) => Promise<Item[]>;
  searchItems: (input: ItemSearchInput) => Promise<ItemSearchResult>;
  createItem: (input: CreateItemInput) => Promise<Item>;
  updateItem: (input: UpdateItemInput) => Promise<Item>;
  deleteItem: (ticketNumber: number, itemNumber: number) => Promise<void>;
  linkItemsToTicket: (
    ticketNumber: number,
    itemNumbers: number[],
  ) => Promise<Item[]>;
};
