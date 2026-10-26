import type { Ticket } from "./ticket.model.ts";

export interface Item {
  item_number: number;
  source_item_number?: number;
  quantity: number;
  subcategory_id?: number;
  category_name?: string;
  subcategory_name?: string;
  description: string;
  brand_name?: string;
  model_number?: string;
  serial_number?: string;
  amount: number;
  latest_ticket_number?: number;
  latest_ticket_status?: Ticket["status"];
  is_loadable?: boolean;
  image_path?: string;
  draft_id?: string;
  is_loaded_draft?: boolean;
}
