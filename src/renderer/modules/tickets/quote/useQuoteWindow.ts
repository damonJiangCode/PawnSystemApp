import { useEffect, useMemo, useState } from "react";
import type { Item } from "../../../../shared/models/item.model";
import type { Ticket } from "../../../../shared/models/ticket.model";
import type { OpenQuoteWindowInput } from "../../../../shared/payload-contracts/window.contract";
import { calculation } from "../../../../shared/utils/calculation";
import { getTicketPickupAmount } from "../../../../shared/utils/ticketFinance";
import { getAppApi } from "../../../shared/api/app.api";
import { formatIsoDate } from "../../../shared/utils/formatters";
import { itemApi } from "../../items/item.api";
import { ticketApi } from "../ticket.api";

export type QuoteRow = {
  ticket: Ticket;
  items: Item[];
  interestDue: number;
  pickupAmount: number;
};

const getInitialInput = (): OpenQuoteWindowInput => {
  const params = new URLSearchParams(window.location.search);

  return {
    clientNumber: Number(params.get("clientNumber")),
    clientLastName: params.get("clientLastName") ?? "",
    clientFirstName: params.get("clientFirstName") ?? "",
    clientMiddleName: params.get("clientMiddleName") || undefined,
  };
};

const toLocalDate = (date: string) => new Date(`${date}T12:00:00`);

export const useQuoteWindow = () => {
  const today = useMemo(() => formatIsoDate(new Date()), []);
  const [input, setInput] = useState<OpenQuoteWindowInput>(getInitialInput);
  const [quoteDate, setQuoteDate] = useState(today);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [itemsByTicket, setItemsByTicket] = useState<Map<number, Item[]>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    return getAppApi()?.window.onQuoteWindowInputUpdated(setInput);
  }, []);

  useEffect(() => {
    let active = true;

    const loadQuoteData = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const pawnedTickets = (await ticketApi.loadTickets(input.clientNumber))
          .filter((ticket) => ticket.status === "pawned")
          .sort(
            (left, right) =>
              Number(left.ticket_number ?? 0) -
              Number(right.ticket_number ?? 0),
          );
        const itemEntries = await Promise.all(
          pawnedTickets.map(async (ticket) => {
            const ticketNumber = Number(ticket.ticket_number);
            return [
              ticketNumber,
              await itemApi.loadItems(ticketNumber),
            ] as const;
          }),
        );

        if (!active) {
          return;
        }

        setTickets(pawnedTickets);
        setItemsByTicket(new Map(itemEntries));
      } catch (error) {
        if (!active) {
          return;
        }

        setTickets([]);
        setItemsByTicket(new Map());
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load quote.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadQuoteData();

    return () => {
      active = false;
    };
  }, [input.clientNumber]);

  const rows = useMemo<QuoteRow[]>(() => {
    if (!quoteDate) return [];
    const asOf = toLocalDate(quoteDate);

    return tickets.map((ticket) => ({
      ticket,
      items: itemsByTicket.get(Number(ticket.ticket_number)) ?? [],
      pickupAmount: getTicketPickupAmount(ticket, asOf),
      interestDue: calculation.getInterestDue(
        Number(ticket.amount ?? 0),
        new Date(ticket.due_date),
        asOf,
      ),
    }));
  }, [itemsByTicket, quoteDate, tickets]);

  return {
    state: {
      input,
      today,
      quoteDate,
      rows,
      loading,
      errorMessage,
      totalInterestDue: rows.reduce((sum, row) => sum + row.interestDue, 0),
      totalPickupAmount: rows.reduce((sum, row) => sum + row.pickupAmount, 0),
    },
    actions: {
      setQuoteDate: (date: string) => {
        if (!date || date >= today) {
          setQuoteDate(date);
        }
      },
      print: () => {
        if (quoteDate) window.print();
      },
    },
  };
};
