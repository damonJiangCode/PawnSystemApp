import type { ItemApi } from "../../../../shared/api-contracts/itemApi.contract.ts";
import type { Item } from "../../../../shared/models/item.model.ts";
import type {
  CreateItemInput,
  ItemSearchInput,
  ItemSearchResult,
} from "../../../../shared/payload-contracts/item.contract.ts";
import { API_BASE_URL, apiUrl, jsonBody, requestJson } from "./http.ts";

export type HttpItemMethods =
  | "loadItemsByTicket"
  | "searchItems"
  | "createItem";

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

export const createItemHttpApi = (
  baseUrl = API_BASE_URL,
): Pick<ItemApi, HttpItemMethods> => ({
  loadItemsByTicket: (ticketNumber) =>
    loadItemsByTicketHttp(ticketNumber, baseUrl),
  searchItems: (input) => searchItemsHttp(input, baseUrl),
  createItem: (input) => createItemHttp(input, baseUrl),
});
