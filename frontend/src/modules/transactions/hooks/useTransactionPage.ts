import { useEffect, useState } from "react";
import type { Item } from "../../../../../shared/models/item.model";
import type { Ticket } from "../../../../../shared/models/ticket.model";
import { itemApi } from "../../items/item.api";
import type { ItemCategoryOption } from "../../../../../shared/payload-contracts/reference.contract";
import { ticketApi } from "../../tickets/ticket.api";
import {
  filterVisibleTickets,
  sortTickets,
} from "../helpers/transaction.helpers";
import type { Client } from "../../../../../shared/models/client.model";
import { createTransactionItemHandlers } from "../handlers/transactionItemHandlers";
import { createTransactionTicketHandlers } from "../handlers/transactionTicketHandlers";
import { referenceApi } from "../../reference/reference.api";

interface UseTransactionPageParams {
  isActive?: boolean;
  client?: Client;
  focusTicketNumber?: number;
  focusRequestId?: number;
  refreshKey?: number;
  incomingTicket?: Ticket | null;
  onSelectedTicketChange?: (ticket: Ticket | null) => void;
  onClientSellCountChanged?: (delta: 1 | -1) => void;
}

export const useTransactionPage = ({
  isActive = true,
  client,
  focusTicketNumber,
  focusRequestId,
  refreshKey = 0,
  incomingTicket,
  onSelectedTicketChange,
  onClientSellCountChanged,
}: UseTransactionPageParams) => {
  const clientNumber = client?.client_number;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string>("");
  const [itemsError, setItemsError] = useState<string>("");
  const [itemCategoriesError, setItemCategoriesError] = useState<string>("");
  const [openTicketPawnDialog, setOpenTicketPawnDialog] = useState(false);
  const [openTicketSellDialog, setOpenTicketSellDialog] = useState(false);
  const [openTicketEditDialog, setOpenTicketEditDialog] = useState(false);
  const [openTicketConvertDialog, setOpenTicketConvertDialog] = useState(false);
  const [openTicketTransferDialog, setOpenTicketTransferDialog] =
    useState(false);
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [itemDialogMode, setItemDialogMode] = useState<"add" | "edit">("add");
  const [removeItemTarget, setRemoveItemTarget] = useState<Item | null>(null);
  const [itemCategories, setItemCategories] = useState<ItemCategoryOption[]>(
    [],
  );
  const [statusMessage, setStatusMessage] = useState("");
  const loading = ticketsLoading || itemsLoading;
  const displayedItems = selectedTicket?.ticket_number ? items : [];
  const ticketHandlers = createTransactionTicketHandlers({
    client,
    selectedTicket,
    setTickets,
    setItems,
    setSelectedTicket,
    setSelectedItem,
    setOpenTicketPawnDialog,
    setOpenTicketSellDialog,
    setOpenTicketEditDialog,
    setOpenTicketConvertDialog,
    setOpenTicketTransferDialog,
    setStatusMessage,
    onClientSellCountChanged,
  });
  const itemHandlers = createTransactionItemHandlers({
    items,
    selectedTicket,
    removeItemTarget,
    setItems,
    setSelectedItem,
    setOpenItemDialog,
    setItemDialogMode,
    setRemoveItemTarget,
    setStatusMessage,
  });

  useEffect(() => {
    setTickets([]);
    setItems([]);
    setSelectedTicket(null);
    setSelectedItem(null);
    setTicketsError("");
    setItemsError("");
    setStatusMessage("");
  }, [clientNumber]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let active = true;

    const fetchTickets = async () => {
      if (!clientNumber) {
        setTickets([]);
        setItems([]);
        setSelectedTicket(null);
        setSelectedItem(null);
        setTicketsError("");
        setItemsError("");
        setStatusMessage("");
        return;
      }

      setTicketsLoading(true);
      setTicketsError("");
      setStatusMessage("");

      try {
        const fetchedTickets = await ticketApi.loadTickets(clientNumber);
        const visibleTickets = filterVisibleTickets(fetchedTickets);
        if (!active) {
          return;
        }

        setTickets(visibleTickets);
        setSelectedTicket((prev) => {
          if (!visibleTickets.length) {
            return null;
          }

          if (!prev) {
            return visibleTickets[visibleTickets.length - 1];
          }

          return (
            visibleTickets.find(
              (ticket) => ticket.ticket_number === prev.ticket_number,
            ) ?? visibleTickets[visibleTickets.length - 1]
          );
        });
      } catch (err) {
        if (!active) {
          return;
        }

        console.error("Failed to load tickets", err);
        setTickets([]);
        setItems([]);
        setSelectedTicket(null);
        setSelectedItem(null);
        setTicketsError(
          err instanceof Error ? err.message : "Unable to load tickets.",
        );
      } finally {
        if (!active) {
          return;
        }

        setTicketsLoading(false);
      }
    };

    void fetchTickets();

    return () => {
      active = false;
    };
  }, [clientNumber, refreshKey, isActive]);

  useEffect(() => {
    if (!focusRequestId || !focusTicketNumber) {
      return;
    }

    const matchedTicket =
      tickets.find((ticket) => ticket.ticket_number === focusTicketNumber) ??
      null;

    if (matchedTicket) {
      setSelectedTicket(matchedTicket);
      setStatusMessage("");
    }
  }, [focusRequestId, focusTicketNumber, tickets]);

  useEffect(() => {
    if (!incomingTicket?.ticket_number) {
      return;
    }

    setTickets((prev) => {
      const nextTickets = prev.some(
        (ticket) => ticket.ticket_number === incomingTicket.ticket_number,
      )
        ? prev.map((ticket) =>
            ticket.ticket_number === incomingTicket.ticket_number
              ? incomingTicket
              : ticket,
          )
        : sortTickets([...prev, incomingTicket]);

      return nextTickets;
    });
  }, [incomingTicket]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let active = true;

    referenceApi
      .preloadItemCategories()
      .then((categories) => {
        if (active) {
          setItemCategories(categories);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Failed to load item categories", err);
          setItemCategoriesError(
            err instanceof Error
              ? err.message
              : "Unable to load item categories.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let active = true;

    const fetchItems = async () => {
      if (
        !selectedTicket?.ticket_number ||
        selectedTicket.client_number !== clientNumber
      ) {
        setItems([]);
        setSelectedItem(null);
        setItemsError("");
        return;
      }

      setItemsLoading(true);
      setItemsError("");

      try {
        const fetchedItems = await itemApi.loadItems(
          selectedTicket.ticket_number,
        );
        if (!active) {
          return;
        }

        setItems(fetchedItems);
        setSelectedItem((prev) => {
          if (!fetchedItems.length) {
            return null;
          }

          if (!prev) {
            return fetchedItems[0];
          }

          return (
            fetchedItems.find(
              (item) => item.item_number === prev.item_number,
            ) ?? fetchedItems[0]
          );
        });
      } catch (err) {
        if (!active) {
          return;
        }

        console.error("Failed to load items", err);
        setItems([]);
        setSelectedItem(null);
        setItemsError(
          err instanceof Error ? err.message : "Unable to load items.",
        );
      } finally {
        if (!active) {
          return;
        }

        setItemsLoading(false);
      }
    };

    void fetchItems();

    return () => {
      active = false;
    };
  }, [
    selectedTicket?.ticket_number,
    selectedTicket?.client_number,
    clientNumber,
    refreshKey,
    isActive,
  ]);

  useEffect(() => {
    if (!selectedTicket) {
      return;
    }

    const matchedTicket =
      tickets.find(
        (ticket) => ticket.ticket_number === selectedTicket.ticket_number,
      ) ?? null;

    if (!matchedTicket) {
      if (
        selectedTicket.status === "pawned" ||
        selectedTicket.status === "sold"
      ) {
        return;
      }

      setSelectedTicket(tickets[0] ?? null);
    }
  }, [tickets, selectedTicket]);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    const matchedItem =
      displayedItems.find(
        (item) =>
          (item.draft_id ?? item.item_number) ===
          (selectedItem.draft_id ?? selectedItem.item_number),
      ) ?? null;

    if (!matchedItem) {
      setSelectedItem(displayedItems[0] ?? null);
    }
  }, [displayedItems, selectedItem]);

  useEffect(() => {
    onSelectedTicketChange?.(selectedTicket);
  }, [onSelectedTicketChange, selectedTicket]);

  const handleTicketSelected = (ticket: Ticket | null) => {
    setSelectedTicket(ticket);
    setStatusMessage("");
  };

  const handlePawnButtonClick = () => {
    if (client?.is_active === false) return;
    setOpenTicketPawnDialog(true);
    setStatusMessage("");
  };

  const handleEditButtonClick = () => {
    setOpenTicketEditDialog(true);
    setStatusMessage("");
  };

  const handleSellButtonClick = () => {
    if (client?.is_active === false) return;
    setOpenTicketSellDialog(true);
    setStatusMessage("");
  };

  const handleConvertTicket = () => {
    if (client?.is_active === false) return;
    if (!selectedTicket) {
      return;
    }

    setOpenTicketConvertDialog(true);
    setStatusMessage("");
  };

  const handleTransferTicket = () => {
    if (client?.is_active === false) return;
    if (!clientNumber) {
      return;
    }

    setOpenTicketTransferDialog(true);
    setStatusMessage("");
  };

  return {
    state: {
      tickets,
      items: displayedItems,
      selectedTicket,
      selectedItem,
      loading,
      itemsLoading,
      ticketsError,
      itemsError: itemsError || itemCategoriesError,
      statusMessage,
      openTicketPawnDialog,
      openTicketSellDialog,
      openTicketEditDialog,
      openTicketConvertDialog,
      openTicketTransferDialog,
      openItemDialog,
      itemDialogMode,
      removeItemTarget,
      itemCategories,
    },
    actions: {
      setOpenTicketPawnDialog,
      setOpenTicketSellDialog,
      setOpenTicketEditDialog,
      setOpenTicketConvertDialog,
      setOpenTicketTransferDialog,
      setOpenItemDialog,
      setRemoveItemTarget,
      handleTicketSelected,
      handlePawnButtonClick,
      handleEditButtonClick,
      handleSellButtonClick,
      handleTicketPrint: ticketHandlers.handleTicketPrint,
      handleQuote: ticketHandlers.handleQuote,
      handleConvertTicket,
      handleTransferTicket,
      handlePawnTicket: ticketHandlers.handlePawnTicket,
      handleSellTicket: ticketHandlers.handleSellTicket,
      handleEditTicket: ticketHandlers.handleEditTicket,
      handleLoadTransferTicketPreview:
        ticketHandlers.handleLoadTransferTicketPreview,
      handleConvertTicketConfirmed: ticketHandlers.handleConvertTicketConfirmed,
      handleTransferTicketConfirmed:
        ticketHandlers.handleTransferTicketConfirmed,
      handleItemClick: itemHandlers.handleItemClick,
      handleAddItem: itemHandlers.handleAddItem,
      handleEditItem: itemHandlers.handleEditItem,
      handleRemoveItem: itemHandlers.handleRemoveItem,
      handleItemSaved: itemHandlers.handleItemSaved,
      handleConfirmRemoveItem: itemHandlers.handleConfirmRemoveItem,
    },
  };
};
