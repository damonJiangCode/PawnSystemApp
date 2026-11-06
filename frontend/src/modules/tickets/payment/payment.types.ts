import type { GridRowSelectionModel } from "@mui/x-data-grid";
import type { Ticket } from "../../../../../shared/models/ticket.model";

export type PaymentMode = "pickup" | "extension";
export type PaymentStatusSeverity = "info" | "success" | "warning" | "lost";

export type PaymentTicketRow = {
  id: number | string;
  ticketNumber: number;
  status: Ticket["status"];
  isLost: boolean;
  location: string;
  description: string;
  dueDate: Date;
  sourceDueDate: Date;
  pickupAmount?: number;
  baseExtensionAmount: number;
  extensionAmount: number;
  extensionMonths: number;
  isPickupAllowed: boolean;
  earliestPickupDate: string;
};

export type PaymentRowsByMode = Record<PaymentMode, PaymentTicketRow[]>;
export type PaymentSelectionByMode = Record<PaymentMode, GridRowSelectionModel>;
