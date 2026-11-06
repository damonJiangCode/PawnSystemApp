import type { ReportDateRangeInput } from "./ticket.contract.ts";

export type XmlReportConnectionResult = {
  environment: "sandbox" | "production";
  connected: boolean;
  error_code: number;
  message: string;
};

export type XmlReportProperty = {
  Name: string;
  Value: string;
};

export type XmlReportItemPayload = {
  make: string;
  model: string;
  serialNumber: string;
  description: string;
  amount: number;
  itemType: "Other" | "Jewelry" | "Firearm";
  itemStatus: "Pawn" | "Buy";
  isVoid: false;
  employee: string;
  extraItem: { PropertyValue: XmlReportProperty[] };
};

export type XmlReportTicketPayload = {
  key: {
    ticketType: "Pawn" | "Buy";
    ticketnumber: string;
    ticketDateTime: string;
  };
  redeemByDate: string;
  customer: {
    name: string;
    fname: string;
    lname: string;
    address1: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
    idType: string;
    idNumber: string;
    dob: string;
    weight: number;
    height: number;
    eyeColor: string;
    hairColor: string;
    sex: string;
    extraCustomer: { PropertyValue: XmlReportProperty[] };
  };
  items: { Item: XmlReportItemPayload[] };
  isVoid: false;
  extraTicket: { PropertyValue: XmlReportProperty[] };
};

export type XmlReportTicketPreview = {
  payload: XmlReportTicketPayload;
  errors: string[];
  warnings: string[];
  submission_status: "pending" | "submitted" | "failed";
  submission_message: string;
};

export type XmlReportPreviewResult = ReportDateRangeInput & {
  tickets: XmlReportTicketPreview[];
  total_tickets: number;
  valid_tickets: number;
  invalid_tickets: number;
};

export type XmlReportSubmissionResult = {
  from_date: string;
  to_date: string;
  results: Array<{
    ticket_number: number;
    status: "submitted" | "failed" | "skipped";
    error_code: number;
    message: string;
  }>;
  submitted_tickets: number;
  failed_tickets: number;
  skipped_tickets: number;
};
