import type { Dispatch, SetStateAction } from "react";
import type { Item } from "../../../../../shared/models/item.model";
import type { Ticket } from "../../../../../shared/models/ticket.model";
import type { Client } from "../../../../../shared/models/client.model";
import {
  type ConvertTicketInput,
  ticketApi,
  type CreatePawnTicketInput,
  type CreateSellTicketInput,
  type TransferTicketPreview,
  type UpdateTicketInput,
} from "../../tickets/ticket.api";
import { itemApi } from "../../items/item.api";
import { getAppApi } from "../../../shared/api/app.api";
import {
  filterVisibleTickets,
  sortTickets,
} from "../helpers/transaction.helpers";

type TransactionTicketHandlerDeps = {
  client?: Client;
  selectedTicket: Ticket | null;
  setTickets: Dispatch<SetStateAction<Ticket[]>>;
  setItems: Dispatch<SetStateAction<Item[]>>;
  setSelectedTicket: Dispatch<SetStateAction<Ticket | null>>;
  setSelectedItem: Dispatch<SetStateAction<Item | null>>;
  setOpenTicketPawnDialog: Dispatch<SetStateAction<boolean>>;
  setOpenTicketSellDialog: Dispatch<SetStateAction<boolean>>;
  setOpenTicketEditDialog: Dispatch<SetStateAction<boolean>>;
  setOpenTicketConvertDialog: Dispatch<SetStateAction<boolean>>;
  setOpenTicketTransferDialog: Dispatch<SetStateAction<boolean>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  onClientSellCountChanged?: (delta: 1 | -1) => void;
};

export const createTransactionTicketHandlers = ({
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
}: TransactionTicketHandlerDeps) => {
  const clientNumber = client?.client_number;

  const handleTicketPrint = () => {
    if (!selectedTicket) {
      return;
    }

    ticketApi.printEnvelopeTicket(selectedTicket, client);
    setStatusMessage(
      `Envelope print ready for ticket #${selectedTicket.ticket_number}.`,
    );
  };

  const handleQuote = async () => {
    if (!clientNumber || !client) {
      return;
    }

    await getAppApi()?.window.openQuoteWindow({
      clientNumber,
      clientLastName: client.last_name,
      clientFirstName: client.first_name,
      clientMiddleName: client.middle_name,
    });
  };

  const handlePawnTicket = async (
    ticketData: Omit<CreatePawnTicketInput, "client_number">,
  ): Promise<void> => {
    if (!clientNumber) {
      throw new Error("Please select a client first.");
    }

    const newTicket = await ticketApi.createPawnTicket({
      ...ticketData,
      client_number: clientNumber,
    });

    setTickets((prev) => sortTickets([...prev, newTicket]));
    setSelectedTicket(newTicket);
    setItems([]);
    setSelectedItem(null);
    setOpenTicketPawnDialog(false);
    ticketApi.printEnvelopeTicket(newTicket, client);
    setStatusMessage(`Ticket #${newTicket.ticket_number} pawned.`);
  };

  const handleSellTicket = async (
    ticketData: Omit<CreateSellTicketInput, "client_number">,
  ): Promise<void> => {
    if (!clientNumber) {
      throw new Error("Please select a client first.");
    }

    const newTicket = await ticketApi.createSellTicket({
      ...ticketData,
      client_number: clientNumber,
    });

    setTickets((prev) => sortTickets([...prev, newTicket]));
    setSelectedTicket(newTicket);
    setItems([]);
    setSelectedItem(null);
    setOpenTicketSellDialog(false);
    onClientSellCountChanged?.(1);
    ticketApi.printEnvelopeTicket(newTicket, client);
    setStatusMessage(`Ticket #${newTicket.ticket_number} sold.`);
  };

  const handleEditTicket = async (data: UpdateTicketInput): Promise<void> => {
    if (!selectedTicket) {
      throw new Error("Please select a ticket first.");
    }

    const updatedTicket = await ticketApi.updateTicket(data);
    const updatedTicketNumber = updatedTicket.ticket_number;

    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.ticket_number === updatedTicketNumber ? updatedTicket : ticket,
      ),
    );
    setSelectedTicket(updatedTicket);
    setOpenTicketEditDialog(false);
    requestAnimationFrame(() => {
      setSelectedTicket(updatedTicket);
    });
    setStatusMessage(`Ticket #${updatedTicket.ticket_number} updated.`);
  };

  const handleLoadTransferTicketPreview = async (
    ticketNumber: number,
  ): Promise<TransferTicketPreview | null> => {
    return ticketApi.loadTransferTicketPreview(ticketNumber);
  };

  const handleConvertTicketConfirmed = async (
    data: ConvertTicketInput,
  ): Promise<void> => {
    if (!selectedTicket) {
      throw new Error("Please select a ticket first.");
    }

    const convertedTicket = await ticketApi.convertTicket(data);
    const fromStatus = selectedTicket.status;

    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.ticket_number === convertedTicket.ticket_number
          ? convertedTicket
          : ticket,
      ),
    );
    setSelectedTicket(convertedTicket);
    onClientSellCountChanged?.(convertedTicket.status === "sold" ? 1 : -1);
    const refreshedItems = convertedTicket.ticket_number
      ? await itemApi.loadItems(convertedTicket.ticket_number)
      : [];
    setItems(refreshedItems);
    setSelectedItem((prev) => {
      if (!refreshedItems.length) {
        return null;
      }

      return (
        refreshedItems.find((item) => item.item_number === prev?.item_number) ??
        refreshedItems[0]
      );
    });
    setOpenTicketConvertDialog(false);
    setStatusMessage(
      `Ticket #${convertedTicket.ticket_number} converted from ${fromStatus} to ${convertedTicket.status}.`,
    );
  };

  const handleTransferTicketConfirmed = async (
    ticketNumber: number,
  ): Promise<void> => {
    if (!clientNumber) {
      throw new Error("Please select a client first.");
    }

    const transferredTicket = await ticketApi.transferTicket({
      ticket_number: ticketNumber,
      client_number: clientNumber,
    });
    const refreshedTickets = filterVisibleTickets(
      await ticketApi.loadTickets(clientNumber),
    );

    setTickets(refreshedTickets);
    setSelectedTicket(
      refreshedTickets.find(
        (ticket) => ticket.ticket_number === transferredTicket.ticket_number,
      ) ?? transferredTicket,
    );
    setItems([]);
    setSelectedItem(null);
    setOpenTicketTransferDialog(false);
    setStatusMessage(`Ticket #${transferredTicket.ticket_number} transferred.`);
  };

  return {
    handleTicketPrint,
    handleQuote,
    handlePawnTicket,
    handleSellTicket,
    handleEditTicket,
    handleLoadTransferTicketPreview,
    handleConvertTicketConfirmed,
    handleTransferTicketConfirmed,
  };
};
