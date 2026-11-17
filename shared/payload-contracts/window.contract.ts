import type { Item } from "../models/item.model.ts";

export type OpenItemSearchWindowInput = {
  sourceTicketNumber?: number;
  items: Item[];
  mode?: "repawn" | "load" | "search";
  focusWindow?: boolean;
};

export type OpenPaymentWindowInput = {
  clientNumber?: number;
  clientLastName?: string;
  clientFirstName?: string;
};

export type OpenQuoteWindowInput = {
  clientNumber: number;
  clientLastName: string;
  clientFirstName: string;
  clientMiddleName?: string;
};

export type PaymentCompletedEvent = {
  type: "payment-completed";
  pickedUpCounts: Array<{
    clientNumber: number;
    count: number;
  }>;
};

// What Electron's preload exposes as `window.appAPI.window`.
export type WindowApi = {
  openPaymentWindow: (input: OpenPaymentWindowInput) => Promise<void>;
  onPaymentWindowInputUpdated: (
    callback: (input: OpenPaymentWindowInput) => void,
  ) => () => void;
  openQuoteWindow: (input: OpenQuoteWindowInput) => Promise<void>;
  onQuoteWindowInputUpdated: (
    callback: (input: OpenQuoteWindowInput) => void,
  ) => () => void;
  openTicketSearchWindow: () => Promise<void>;
  openItemSearchWindow: (input?: OpenItemSearchWindowInput) => Promise<void>;
  focusMainWindow: () => Promise<void>;
  getItemSearchWindowInput: () => Promise<OpenItemSearchWindowInput | null>;
  onItemSearchWindowInputUpdated: (callback: () => void) => () => void;
};
