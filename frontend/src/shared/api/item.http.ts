import type { ItemApi } from "../../../../shared/api-contracts/itemApi.contract.ts";
import type { Item } from "../../../../shared/models/item.model.ts";
import type {
  ItemSearchInput,
  ItemSearchResult,
} from "../../../../shared/payload-contracts/item.contract.ts";
import { API_BASE_URL, apiUrl, requestJson } from "./http.ts";

export type HttpItemMethods = "loadItemsByTicket" | "searchItems";

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
    const text = value === undefined ? "" : String(value).trim();
    if (text) url.searchParams.set(key, text);
  }
  return requestJson<ItemSearchResult>(url);
}

export const createItemHttpApi = (
  baseUrl = API_BASE_URL,
): Pick<ItemApi, HttpItemMethods> => ({
  loadItemsByTicket: (ticketNumber) =>
    loadItemsByTicketHttp(ticketNumber, baseUrl),
  searchItems: (input) => searchItemsHttp(input, baseUrl),
});
