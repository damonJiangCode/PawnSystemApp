import React from "react";
import type {
  GridPaginationModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import type { Item } from "../../../../../../shared/models/item.model";
import { getAppApi } from "../../../../shared/api/app.api";
import { itemApi } from "../../item.api";
import { ticketApi } from "../../../tickets/ticket.api";
import {
  getItemId,
  isItemAddable,
  ITEM_SEARCH_WINDOW_PAGE_SIZE,
  mergeCheckedItemIds,
  mergeItems,
  ticketSearchHistoryStatuses,
  type ItemSearchWindowMode,
  type ItemSearchWindowTargetStatus,
} from "./itemSearchWindow.helpers";
import type { ItemCategoryOption } from "../../../../../../shared/payload-contracts/reference.contract";
import { referenceApi } from "../../../reference/reference.api";

type ItemSearchAddToTicketResultEvent = {
  type: "item-search-add-to-ticket-result";
  requestId: string;
  item?: Item;
  items?: Item[];
  message?: string;
  error?: string;
};

type ItemSearchTargetStatusEvent = ItemSearchWindowTargetStatus & {
  type: "item-search-target-status";
  requestId?: string;
};

const isItemSearchAddToTicketResultEvent = (
  value: unknown,
): value is ItemSearchAddToTicketResultEvent => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    (value as { type?: string }).type === "item-search-add-to-ticket-result"
  );
};

const isItemSearchTargetStatusEvent = (
  value: unknown,
): value is ItemSearchTargetStatusEvent => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (value as { type?: string }).type === "item-search-target-status";
};

export const useItemSearchWindow = () => {
  const itemNumberInputRef = React.useRef<HTMLInputElement>(null);
  const serialNumberInputRef = React.useRef<HTMLInputElement>(null);
  const menuEventsChannelRef = React.useRef<BroadcastChannel | null>(null);
  const addToTicketRequestIdRef = React.useRef("");
  const loadedInputItemIdsRef = React.useRef<Set<string>>(new Set());
  const searchRequestIdRef = React.useRef(0);
  const selectedClientNumberRef = React.useRef<number | undefined>(undefined);
  const [loadedClientNumber, setLoadedClientNumber] = React.useState<
    number | undefined
  >();
  const [mode, setMode] = React.useState<ItemSearchWindowMode>("details");
  const [itemNumber, setItemNumber] = React.useState("");
  const [categories, setCategories] = React.useState<ItemCategoryOption[]>([]);
  const [categoryName, setCategoryName] = React.useState("");
  const [subcategory, setSubcategory] =
    React.useState<ItemCategoryOption | null>(null);
  const [brandName, setBrandName] = React.useState("");
  const [modelNumber, setModelNumber] = React.useState("");
  const [serialNumber, setSerialNumber] = React.useState("");
  const [items, setItems] = React.useState<Item[]>([]);
  const [checkedItemIds, setCheckedItemIds] =
    React.useState<GridRowSelectionModel>([]);
  const [selectedItem, setSelectedItem] = React.useState<Item | null>(null);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [openingTicket, setOpeningTicket] = React.useState(false);
  const [addingToTicket, setAddingToTicket] = React.useState(false);
  const [targetStatus, setTargetStatus] =
    React.useState<ItemSearchWindowTargetStatus>({
      canAddToTicket: false,
    });
  const [paginationModel, setPaginationModel] =
    React.useState<GridPaginationModel>({
      page: 0,
      pageSize: ITEM_SEARCH_WINDOW_PAGE_SIZE,
    });

  const categoryNames = React.useMemo(
    () =>
      [...new Set(categories.map((category) => category.category_name))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [categories],
  );

  const subcategoryOptions = React.useMemo(() => {
    const options = categoryName
      ? categories.filter((category) => category.category_name === categoryName)
      : categories;

    return [...options].sort((a, b) =>
      a.subcategory_name.localeCompare(b.subcategory_name),
    );
  }, [categories, categoryName]);

  const selectedCategoryId = React.useMemo(() => {
    if (!categoryName) {
      return undefined;
    }

    return categories.find(
      (category) => category.category_name === categoryName,
    )?.category_id;
  }, [categories, categoryName]);

  const checkedItems = React.useMemo(() => {
    const checkedIdSet = new Set(checkedItemIds.map(String));
    return items.filter((item) => checkedIdSet.has(String(getItemId(item))));
  }, [checkedItemIds, items]);

  const addableCheckedItems = React.useMemo(
    () =>
      checkedItems.filter((item) =>
        isItemAddable(item, targetStatus.targetTicketNumber),
      ),
    [checkedItems, targetStatus.targetTicketNumber],
  );

  const canSearch =
    mode === "item-number"
      ? Boolean(itemNumber.trim())
      : Boolean(
          selectedCategoryId ||
          subcategory?.subcategory_id ||
          brandName.trim() ||
          modelNumber.trim() ||
          serialNumber.trim(),
        );
  const canGoToTicket =
    Boolean(selectedItem?.latest_ticket_number) && !openingTicket;
  const canAddToTicket =
    targetStatus.canAddToTicket &&
    addableCheckedItems.length > 0 &&
    !addingToTicket;
  const pageCount = Math.max(
    1,
    Math.ceil(items.length / ITEM_SEARCH_WINDOW_PAGE_SIZE),
  );
  const currentPage = Math.min(paginationModel.page, pageCount - 1);

  const setPage = (page: number) => {
    setPaginationModel({
      page: Math.min(Math.max(page, 0), pageCount - 1),
      pageSize: ITEM_SEARCH_WINDOW_PAGE_SIZE,
    });
  };

  const appendLoadedItems = React.useCallback(async () => {
    const windowApi = getAppApi()?.window;
    if (!windowApi) {
      setError("Item search window is unavailable.");
      return;
    }

    const input = await windowApi.getItemSearchWindowInput();

    if (!input?.items.length) {
      return;
    }

    const nextItems = input.items.filter((item) => {
      const itemId = String(getItemId(item));
      return !loadedInputItemIdsRef.current.has(itemId);
    });

    input.items.forEach((item) => {
      loadedInputItemIdsRef.current.add(String(getItemId(item)));
    });

    if (!nextItems.length) {
      return;
    }

    const nextCheckedIds = nextItems
      .filter((item) => isItemAddable(item))
      .map(getItemId);

    setItems((prev) => mergeItems(prev, nextItems));
    setCheckedItemIds((prev) => mergeCheckedItemIds(prev, nextCheckedIds));
    setSelectedItem((prev) => prev ?? nextItems[0] ?? null);
    setMessage(
      input.sourceTicketNumber
        ? `${nextItems.length} item(s) loaded from ticket #${input.sourceTicketNumber}.`
        : `${nextItems.length} item(s) loaded.`,
    );
    setError("");
  }, []);

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (mode === "item-number") {
        itemNumberInputRef.current?.focus();
        itemNumberInputRef.current?.select();
      } else {
        serialNumberInputRef.current?.focus();
        serialNumberInputRef.current?.select();
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [mode]);

  React.useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const loadedCategories = await referenceApi.preloadItemCategories();

        if (active) {
          setCategories(loadedCategories);
        }
      } catch (err) {
        if (!active) return;
        console.error("Failed to load item categories", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load item categories.",
        );
      }
    };

    void loadCategories();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    setPaginationModel((prev) =>
      prev.page === 0
        ? prev
        : {
            page: 0,
            pageSize: ITEM_SEARCH_WINDOW_PAGE_SIZE,
          },
    );
  }, [items]);

  React.useEffect(() => {
    const channel = new BroadcastChannel("menu-events");
    const targetStatusRequestId = crypto.randomUUID();
    menuEventsChannelRef.current = channel;

    channel.onmessage = (event: MessageEvent) => {
      if (
        isItemSearchAddToTicketResultEvent(event.data) &&
        event.data.requestId === addToTicketRequestIdRef.current
      ) {
        const linkedItems =
          event.data.items ?? (event.data.item ? [event.data.item] : []);

        setAddingToTicket(false);

        if (event.data.error) {
          setError(event.data.error);
          return;
        }

        if (linkedItems.length) {
          const linkedItemIds = new Set(
            linkedItems.map((item) => item.item_number),
          );

          setItems((prev) =>
            prev.map(
              (item) =>
                linkedItems.find(
                  (linkedItem) => linkedItem.item_number === item.item_number,
                ) ?? item,
            ),
          );
          setCheckedItemIds((prev) =>
            prev.filter((id) => !linkedItemIds.has(Number(id))),
          );
          setSelectedItem((prev) => {
            if (!prev || !linkedItemIds.has(prev.item_number)) {
              return prev;
            }

            return linkedItems[0] ?? prev;
          });
        }

        setMessage(event.data.message ?? "Item(s) added to ticket.");
        setError("");
        return;
      }

      if (
        isItemSearchTargetStatusEvent(event.data) &&
        (!event.data.requestId ||
          event.data.requestId === targetStatusRequestId)
      ) {
        selectedClientNumberRef.current = event.data.selectedClientNumber;
        setTargetStatus(event.data);
      }
    };

    channel.postMessage({
      type: "item-search-target-status-request",
      requestId: targetStatusRequestId,
    });
    void appendLoadedItems().catch((err) => {
      console.error("Failed to load items into the item search window", err);
      setError(
        err instanceof Error ? err.message : "Unable to load selected items.",
      );
    });

    const windowApi = getAppApi()?.window;
    const unsubscribe = windowApi
      ? windowApi.onItemSearchWindowInputUpdated(() => {
          void appendLoadedItems().catch((err) => {
            console.error(
              "Failed to update items in the item search window",
              err,
            );
            setError(
              err instanceof Error
                ? err.message
                : "Unable to load selected items.",
            );
          });
        })
      : () => {};

    if (!windowApi) {
      setError("Item search window is unavailable.");
    }

    return () => {
      menuEventsChannelRef.current = null;
      unsubscribe();
      channel.close();
    };
  }, [appendLoadedItems]);

  React.useEffect(() => {
    if (
      loadedClientNumber !== undefined &&
      loadedClientNumber !== targetStatus.selectedClientNumber
    ) {
      searchRequestIdRef.current += 1;
      setSearching(false);
      setLoadedClientNumber(undefined);
      setItems([]);
      setCheckedItemIds([]);
      setSelectedItem(null);
      setMessage("");
      setError("");
    }
  }, [loadedClientNumber, targetStatus.selectedClientNumber]);

  const handleLoadClientItems = async () => {
    const clientNumber = targetStatus.selectedClientNumber;
    if (!clientNumber || searching) return;
    const requestId = ++searchRequestIdRef.current;
    setLoadedClientNumber(clientNumber);
    setSearching(true);
    setError("");
    setMessage("");
    setItems([]);
    setCheckedItemIds([]);
    setSelectedItem(null);
    try {
      const results = await itemApi.searchItems({
        client_number: clientNumber,
      });
      if (
        requestId !== searchRequestIdRef.current ||
        selectedClientNumberRef.current !== clientNumber
      )
        return;
      setItems(results);
      setSelectedItem(results[0] ?? null);
      setMessage(
        `${results.length} item(s) previously recorded for client #${clientNumber}.`,
      );
    } catch (err) {
      if (requestId === searchRequestIdRef.current) {
        setError(
          err instanceof Error ? err.message : "Unable to load client items.",
        );
      }
    } finally {
      if (requestId === searchRequestIdRef.current) setSearching(false);
    }
  };

  const handleSearch = async () => {
    setError("");
    setMessage("");

    const normalizedItemNumber = Number(itemNumber);

    if (!canSearch) {
      setError("Enter at least one search field.");
      return;
    }

    if (
      mode === "item-number" &&
      (!Number.isFinite(normalizedItemNumber) || normalizedItemNumber <= 0)
    ) {
      setError("Enter a valid item number.");
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    setLoadedClientNumber(undefined);
    setSearching(true);

    try {
      const results = await itemApi.searchItems(
        mode === "item-number"
          ? { item_number: normalizedItemNumber }
          : {
              category_id: selectedCategoryId,
              subcategory_id: subcategory?.subcategory_id,
              brand_name: brandName.trim(),
              model_number: modelNumber.trim(),
              serial_number: serialNumber.trim(),
            },
      );
      const checkedIdSet = new Set(checkedItemIds.map(String));
      if (requestId !== searchRequestIdRef.current) return;
      const retainedCheckedItems = items.filter((item) =>
        checkedIdSet.has(String(getItemId(item))),
      );
      const nextItems = mergeItems(retainedCheckedItems, results);

      setItems(nextItems);
      setCheckedItemIds(retainedCheckedItems.map(getItemId));
      setSelectedItem((prev) => {
        if (
          prev &&
          nextItems.some((item) => item.item_number === prev.item_number)
        ) {
          return prev;
        }

        return results[0] ?? retainedCheckedItems[0] ?? null;
      });
      setMessage(
        results.length
          ? `${results.length} item(s) found.`
          : "No matching items found.",
      );
    } catch (err) {
      if (requestId !== searchRequestIdRef.current) return;
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to search items.");
    } finally {
      if (requestId === searchRequestIdRef.current) setSearching(false);
    }
  };

  const handleGoToTicket = async () => {
    if (!selectedItem?.latest_ticket_number) {
      setError("Select an item with a ticket first.");
      return;
    }

    setOpeningTicket(true);
    setError("");

    try {
      const result = await ticketApi.searchTicketByNumber(
        selectedItem.latest_ticket_number,
      );

      if (!result) {
        setError("The selected item's ticket was not found.");
        return;
      }

      const targetTab = ticketSearchHistoryStatuses.has(result.ticket.status)
        ? "history"
        : "transaction";
      const channel = new BroadcastChannel("menu-events");

      channel.postMessage({
        type: "ticket-search-selected",
        ticket: result.ticket,
        client: result.client,
        targetTab,
      });
      channel.close();
      await getAppApi()?.window.focusMainWindow();
    } catch (err) {
      console.error(err);
      setError("Unable to open the selected item's ticket right now.");
    } finally {
      setOpeningTicket(false);
    }
  };

  const handleAddToTicket = () => {
    if (!canAddToTicket) {
      return;
    }

    const requestId = crypto.randomUUID();
    addToTicketRequestIdRef.current = requestId;
    setAddingToTicket(true);
    setError("");
    setMessage("");
    menuEventsChannelRef.current?.postMessage({
      type: "item-search-add-to-ticket",
      requestId,
      itemNumbers: addableCheckedItems.map((item) => item.item_number),
    });
  };

  const handleModeChange = (nextMode: ItemSearchWindowMode | null) => {
    if (!nextMode) {
      return;
    }

    setMode(nextMode);
    setError("");
    setMessage("");
  };

  const handleCheckedItemsChange = (model: GridRowSelectionModel) => {
    const addableIds = new Set(
      items
        .filter((item) => isItemAddable(item, targetStatus.targetTicketNumber))
        .map((item) => String(getItemId(item))),
    );
    setCheckedItemIds(model.filter((id) => addableIds.has(String(id))));
  };

  return {
    refs: {
      itemNumberInputRef,
      serialNumberInputRef,
    },
    state: {
      mode,
      itemNumber,
      categoryName,
      subcategory,
      brandName,
      modelNumber,
      serialNumber,
      items,
      checkedItemIds,
      checkedItems,
      selectedItem,
      message,
      error,
      searching,
      openingTicket,
      addingToTicket,
      targetStatus,
      paginationModel,
      pageCount,
      currentPage,
      categoryNames,
      subcategoryOptions,
      canSearch,
      canLoadClientItems:
        Boolean(targetStatus.selectedClientNumber) && !searching,
      loadingClientItems: searching && loadedClientNumber !== undefined,
      canGoToTicket,
      canAddToTicket,
    },
    actions: {
      setPage,
      setItemNumber,
      setCategoryName,
      setSubcategory,
      setBrandName,
      setModelNumber,
      setSerialNumber,
      setSelectedItem,
      setPaginationModel,
      handleSearch,
      handleLoadClientItems,
      handleGoToTicket,
      handleAddToTicket,
      handleModeChange,
      handleCheckedItemsChange,
    },
  };
};
