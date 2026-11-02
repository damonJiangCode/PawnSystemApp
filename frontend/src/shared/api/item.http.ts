import type { ItemApi } from "../../../../shared/api-contracts/itemApi.contract.ts";
import type { Item } from "../../../../shared/models/item.model.ts";
import { API_BASE_URL, apiUrl, requestJson } from "./http.ts";

// Item methods served over HTTP so far; app.api.ts takes the rest from IPC.
export type HttpItemMethods = "loadItemsByTicket";

export function loadItemsByTicketHttp(
  ticketNumber: number,
  baseUrl = API_BASE_URL,
) {
  return requestJson<Item[]>(apiUrl(`/tickets/${ticketNumber}/items`, baseUrl));
}

export const createItemHttpApi = (
  baseUrl = API_BASE_URL,
): Pick<ItemApi, HttpItemMethods> => ({
  loadItemsByTicket: (ticketNumber) =>
    loadItemsByTicketHttp(ticketNumber, baseUrl),
});
