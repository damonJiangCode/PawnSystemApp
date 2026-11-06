import type {
  OpenItemSearchWindowInput,
  OpenPaymentWindowInput,
  OpenQuoteWindowInput,
} from "../payload-contracts/window.contract.ts";

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
