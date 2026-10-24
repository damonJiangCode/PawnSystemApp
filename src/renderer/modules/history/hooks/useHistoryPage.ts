import { useEffect, useRef, useState } from "react";
import type { Item } from "../../../../shared/models/item.model";
import type { Ticket } from "../../../../shared/models/ticket.model";
import { itemApi, type ItemCategoryOption } from "../../items/item.api";
import {
  ticketApi,
  type CreatePawnTicketInput,
  type ReverseTicketResult,
  type TicketFormError,
} from "../../tickets/ticket.api";
import type { PrintClient } from "../../tickets/print/ticketPrintTemplate";
import { getAppApi } from "../../../shared/api/app.api";
import { canRepawnTicket, sortHistoryTickets } from "../history.helpers";

interface UseHistoryPageParams {
  isActive?: boolean;
  clientNumber?: number;
  clientIsActive?: boolean;
  printClient?: PrintClient;
  focusTicketNumber?: number;
  focusRequestId?: number;
  refreshKey?: number;
  activationKey?: number;
  onRepawnCreated?: (
    ticket: Ticket,
    sourceTicket: Ticket,
    sourceItems: Item[],
  ) => void;
  onReverseCompleted?: (result: ReverseTicketResult) => void;
}

const historyTicketStatuses = new Set<Ticket["status"]>([
  "pawned_expired",
  "pawned_picked_up",
  "sold_expired",
]);

export const useHistoryPage = ({
  isActive = true,
  clientNumber,
  clientIsActive = true,
  printClient,
  focusTicketNumber,
  focusRequestId,
  refreshKey = 0,
  activationKey = 0,
  onRepawnCreated,
  onReverseCompleted,
}: UseHistoryPageParams) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState("");
  const [itemsError, setItemsError] = useState("");
  const [itemCategoriesError, setItemCategoriesError] = useState("");
  const [ticketScrollRequestKey, setTicketScrollRequestKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [openRepawnDialog, setOpenRepawnDialog] = useState(false);
  const [reverseTicket, setReverseTicket] = useState<Ticket | null>(null);
  const [reverseError, setReverseError] = useState("");
  const [reverseProcessing, setReverseProcessing] = useState(false);
  const [openItemEditDialog, setOpenItemEditDialog] = useState(false);
  const [itemCategories, setItemCategories] = useState<ItemCategoryOption[]>(
    [],
  );
  const selectedTicketRef = useRef<Ticket | null>(null);
  const handledActivationKeyRef = useRef(0);

  useEffect(() => {
    selectedTicketRef.current = selectedTicket;
  }, [selectedTicket]);

  useEffect(() => {
    setTickets([]);
    setSelectedTicket(null);
    setItems([]);
    setSelectedItem(null);
    setTicketsError("");
    setItemsError("");
    setStatusMessage("");
    setReverseTicket(null);
    setReverseError("");
  }, [clientNumber]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let active = true;

    itemApi
      .preloadCategories()
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

    const loadTickets = async () => {
      if (!clientNumber) {
        setTickets([]);
        setSelectedTicket(null);
        setItems([]);
        setSelectedItem(null);
        setTicketsError("");
        setItemsError("");
        setStatusMessage("");
        return;
      }

      setTicketsLoading(true);
      setTicketsError("");

      try {
        const fetchedTickets = await ticketApi.loadTickets(clientNumber);
        const historyTickets = sortHistoryTickets(
          fetchedTickets.filter((ticket) =>
            historyTicketStatuses.has(ticket.status),
          ),
        );

        if (!active) return;

        setTickets(historyTickets);
        const nextSelected = historyTickets.length
          ? (historyTickets.find(
              (ticket) =>
                ticket.ticket_number ===
                selectedTicketRef.current?.ticket_number,
            ) ?? historyTickets[historyTickets.length - 1])
          : null;
        setSelectedTicket(nextSelected);
        setTicketScrollRequestKey((prev) => prev + 1);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load ticket history", err);
        setTickets([]);
        setSelectedTicket(null);
        setItems([]);
        setSelectedItem(null);
        setTicketsError(
          err instanceof Error ? err.message : "Unable to load ticket history.",
        );
      } finally {
        if (active) {
          setTicketsLoading(false);
        }
      }
    };

    void loadTickets();

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
      setTicketScrollRequestKey((prev) => prev + 1);
      setStatusMessage("");
    }
  }, [focusRequestId, focusTicketNumber, tickets]);

  useEffect(() => {
    if (
      !activationKey ||
      handledActivationKeyRef.current === activationKey ||
      !tickets.length
    ) {
      return;
    }

    handledActivationKeyRef.current = activationKey;
    setSelectedTicket(tickets[tickets.length - 1]);
    setTicketScrollRequestKey((prev) => prev + 1);
    setStatusMessage("");
  }, [activationKey, tickets]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let active = true;

    const loadItems = async () => {
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

        if (!active) return;

        setItems(fetchedItems);
        setSelectedItem((prev) => {
          if (!fetchedItems.length) return null;
          return (
            fetchedItems.find(
              (item) => item.item_number === prev?.item_number,
            ) ?? fetchedItems[0]
          );
        });
      } catch (err) {
        if (!active) return;
        console.error("Failed to load ticket items", err);
        setItems([]);
        setSelectedItem(null);
        setItemsError(
          err instanceof Error ? err.message : "Unable to load ticket items.",
        );
      } finally {
        if (active) {
          setItemsLoading(false);
        }
      }
    };

    void loadItems();

    return () => {
      active = false;
    };
  }, [
    selectedTicket?.ticket_number,
    selectedTicket?.client_number,
    clientNumber,
    isActive,
  ]);

  const handleRepawn = async () => {
    if (!clientIsActive) return;
    if (!selectedTicket) return;

    if (!canRepawnTicket(selectedTicket)) {
      setStatusMessage("Sold tickets cannot be repawned.");
      return;
    }

    setStatusMessage("");
    if (items.length) {
      await getAppApi()?.window.openItemSearchWindow({
        sourceTicketNumber: selectedTicket.ticket_number,
        items,
        mode: "repawn",
        focusWindow: false,
      });
    }
    setOpenRepawnDialog(true);
  };

  const handleRepawnSave = async (
    ticketData: Omit<CreatePawnTicketInput, "client_number">,
  ) => {
    if (!clientIsActive)
      throw new Error("Reactivate the client before issuing a ticket.");
    if (!clientNumber || !selectedTicket) {
      throw new Error("Please select a client and ticket first.");
    }

    if (!canRepawnTicket(selectedTicket)) {
      setOpenRepawnDialog(false);
      throw new Error("Sold tickets cannot be repawned.");
    }

    const newTicket = await ticketApi.createPawnTicket({
      ...ticketData,
      client_number: clientNumber,
    });

    setOpenRepawnDialog(false);
    ticketApi.printEnvelopeTicket(newTicket, printClient);
    setStatusMessage(`Ticket #${newTicket.ticket_number} repawned.`);
    onRepawnCreated?.(newTicket, selectedTicket, items);
  };

  const handleLoad = () => {
    if (!selectedTicket) return;
    setStatusMessage("");

    if (!items.length) {
      setStatusMessage("This ticket does not have any items to load.");
      return;
    }

    void getAppApi()?.window.openItemSearchWindow({
      sourceTicketNumber: selectedTicket.ticket_number,
      items,
      mode: "load",
      focusWindow: true,
    });
  };

  const handleReverse = () => {
    if (!selectedTicket?.ticket_number) {
      return;
    }

    if (
      selectedTicket.status !== "pawned_expired" &&
      selectedTicket.status !== "pawned_picked_up"
    ) {
      setStatusMessage(
        "Only expired or picked-up pawn tickets can be reversed.",
      );
      return;
    }

    setStatusMessage("");
    setReverseError("");
    setReverseTicket(selectedTicket);
  };

  const handleReverseConfirm = async () => {
    if (!reverseTicket?.ticket_number || reverseProcessing) {
      return;
    }

    setReverseProcessing(true);
    setReverseError("");

    try {
      const result = await ticketApi.reverseTicket({
        ticket_number: reverseTicket.ticket_number,
      });
      setTickets((prev) =>
        prev.filter(
          (ticket) => ticket.ticket_number !== result.ticket.ticket_number,
        ),
      );
      setSelectedTicket(null);
      setReverseTicket(null);
      onReverseCompleted?.(result);
    } catch (error) {
      if (!(error as TicketFormError).field) {
        console.error("Failed to reverse ticket", error);
      }
      setReverseError(
        error instanceof Error
          ? error.message
          : "Unable to reverse the ticket.",
      );
    } finally {
      setReverseProcessing(false);
    }
  };

  const handleItemSaved = (savedItem: Item) => {
    setItems((prev) =>
      prev.map((item) =>
        item.item_number === savedItem.item_number ? savedItem : item,
      ),
    );
    setSelectedItem(savedItem);
    setOpenItemEditDialog(false);
    setStatusMessage(`Item #${savedItem.item_number} updated.`);
  };

  const handleEditItem = (item: Item) => {
    setSelectedItem(item);
    setOpenItemEditDialog(true);
    setStatusMessage("");
  };

  return {
    state: {
      tickets,
      selectedTicket,
      items,
      selectedItem,
      ticketsLoading,
      itemsLoading,
      ticketsError,
      itemsError: itemsError || itemCategoriesError,
      ticketScrollRequestKey,
      statusMessage,
      openRepawnDialog,
      reverseTicket,
      reverseError,
      reverseProcessing,
      openItemEditDialog,
      itemCategories,
    },
    actions: {
      setSelectedTicket,
      setSelectedItem,
      setStatusMessage,
      setOpenRepawnDialog,
      closeReverseDialog: () => {
        if (!reverseProcessing) {
          setReverseTicket(null);
        }
      },
      setOpenItemEditDialog,
      handleRepawn,
      handleRepawnSave,
      handleLoad,
      handleReverse,
      handleReverseConfirm,
      handleEditItem,
      handleItemSaved,
    },
  };
};
