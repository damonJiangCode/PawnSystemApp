import type {
  XmlReportItemPayload,
  XmlReportProperty,
  XmlReportTicketPayload,
} from "../../../../../shared/payload-contracts/xmlReport.contract.ts";

export type XmlReportEnvironment = "sandbox" | "production";

export type XmlReportLogin = {
  storeId: number;
  userName: string;
  password: string;
};

export type XmlReportSourceRow = {
  ticket_number: number;
  transaction_datetime: Date;
  due_date: Date;
  ticket_amount: number;
  ticket_status: string;
  employee_name: string;
  client_number: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  date_of_birth: string;
  gender: string;
  hair_color: string;
  eye_color: string;
  height_cm: number;
  weight_kg: number;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  email: string;
  id_type: string;
  id_value: string;
  item_number?: number;
  quantity?: number;
  category_name: string;
  description: string;
  brand_name: string;
  model_number: string;
  serial_number: string;
  item_amount?: number;
};

export type LeadsOnlineProperty = XmlReportProperty;
export type LeadsOnlineItem = XmlReportItemPayload;
export type LeadsOnlineTicket = XmlReportTicketPayload;
