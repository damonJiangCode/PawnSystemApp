import type { Item } from "@pawnsystem/shared/models/item.model.ts";
import type {
  CreateItemInput,
  ItemPhotoInput,
  ItemSearchInput,
  ItemSearchResult,
  UpdateItemInput,
} from "@pawnsystem/shared/payload-contracts/item.contract.ts";
import { API_BASE_URL, apiUrl, jsonBody, requestJson } from "./http";

export function loadItemsByTicketHttp(
  ticketNumber: number,
  baseUrl = API_BASE_URL,
) {
  return requestJson<Item[]>(apiUrl(`/tickets/${ticketNumber}/items`, baseUrl));
}

export function searchItemsHttp(
  input: ItemSearchInput,
  baseUrl = API_BASE_URL,
) {
  const url = apiUrl("/items/search", baseUrl);
  for (const [key, value] of Object.entries(input)) {
    const text = value == null ? "" : String(value).trim();
    if (text) url.searchParams.set(key, text);
  }
  return requestJson<ItemSearchResult>(url);
}

export function createItemHttp(input: CreateItemInput, baseUrl = API_BASE_URL) {
  // The ticket goes in the path; only the item's own fields go in the body.
  const { ticket_number, ...item } = input;
  return requestJson<Item>(
    apiUrl(`/tickets/${ticket_number}/items`, baseUrl),
    jsonBody("POST", item),
  );
}

export function updateItemHttp(input: UpdateItemInput, baseUrl = API_BASE_URL) {
  const { ticket_number, item_number, ...item } = input;
  return requestJson<Item>(
    apiUrl(`/tickets/${ticket_number}/items/${item_number}`, baseUrl),
    jsonBody("PATCH", item),
  );
}

export function deleteItemHttp(
  ticketNumber: number,
  itemNumber: number,
  baseUrl = API_BASE_URL,
) {
  return requestJson<void>(
    apiUrl(`/tickets/${ticketNumber}/items/${itemNumber}`, baseUrl),
    { method: "DELETE" },
  );
}

export function linkItemsToTicketHttp(
  ticketNumber: number,
  itemNumbers: number[],
  baseUrl = API_BASE_URL,
) {
  return requestJson<Item[]>(
    apiUrl(`/tickets/${ticketNumber}/items/link`, baseUrl),
    jsonBody("POST", { item_numbers: itemNumbers }),
  );
}

export const itemApi = {
  loadItems: async (ticketNumber?: number): Promise<Item[]> =>
    ticketNumber ? loadItemsByTicketHttp(ticketNumber) : [],

  searchItems: (input: ItemSearchInput): Promise<ItemSearchResult> =>
    searchItemsHttp({
      client_number: input.client_number,
      item_number: input.item_number ? Number(input.item_number) : undefined,
      category_id: input.category_id ? Number(input.category_id) : undefined,
      subcategory_id: input.subcategory_id
        ? Number(input.subcategory_id)
        : undefined,
      brand_name: input.brand_name?.trim() ?? "",
      model_number: input.model_number?.trim() ?? "",
      serial_number: input.serial_number?.trim() ?? "",
    }),

  createItem: (input: CreateItemInput) => createItemHttp(input),
  updateItem: (input: UpdateItemInput) => updateItemHttp(input),
  deleteItem: (ticketNumber: number, itemNumber: number) =>
    deleteItemHttp(ticketNumber, itemNumber),
  linkItemsToTicket: (ticketNumber: number, itemNumbers: number[]) =>
    linkItemsToTicketHttp(ticketNumber, itemNumbers),
};

export type {
  CreateItemInput,
  ItemPhotoInput,
  ItemSearchInput,
  UpdateItemInput,
};
