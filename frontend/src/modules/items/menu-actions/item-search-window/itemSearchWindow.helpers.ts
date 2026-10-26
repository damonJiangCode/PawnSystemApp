import type { GridRowSelectionModel } from "@mui/x-data-grid";
import type { Item } from "../../../../../../shared/models/item.model";

export type ItemSearchWindowMode = "details" | "item-number";

export type ItemSearchWindowTargetStatus = {
  canAddToTicket: boolean;
  targetTicketNumber?: number;
  selectedClientNumber?: number;
};

export const ITEM_SEARCH_WINDOW_PAGE_SIZE = 100;

export const ticketSearchHistoryStatuses = new Set([
  "pawned_expired",
  "pawned_picked_up",
  "sold_expired",
]);

export const activeItemTicketStatuses = new Set(["pawned", "sold"]);

export const getItemId = (item: Item) => item.item_number;

export const isItemAddable = (item: Item, targetTicketNumber?: number) =>
  item.is_loadable !== false &&
  (!targetTicketNumber || item.latest_ticket_number !== targetTicketNumber) &&
  !activeItemTicketStatuses.has(item.latest_ticket_status ?? "");

export const getItemStatusRowClass = (item: Item) => {
  if (item.latest_ticket_status === "pawned") return "pawned-item-row";
  if (
    item.latest_ticket_status === "pawned_expired" ||
    item.latest_ticket_status === "sold_expired"
  )
    return "expired-item-row";
  return "";
};

export const mergeItems = (baseItems: Item[], nextItems: Item[]) => {
  const seen = new Set<number>();
  const merged: Item[] = [];

  [...baseItems, ...nextItems].forEach((item) => {
    const itemId = getItemId(item);

    if (seen.has(itemId)) {
      return;
    }

    seen.add(itemId);
    merged.push(item);
  });

  return merged;
};

export const mergeCheckedItemIds = (
  currentIds: GridRowSelectionModel,
  nextIds: number[],
): GridRowSelectionModel => {
  const mergedIds = new Set<number>();

  currentIds.forEach((id) => {
    const itemId = Number(id);

    if (Number.isFinite(itemId)) {
      mergedIds.add(itemId);
    }
  });
  nextIds.forEach((itemId) => {
    if (Number.isFinite(itemId)) {
      mergedIds.add(itemId);
    }
  });

  return [...mergedIds];
};
