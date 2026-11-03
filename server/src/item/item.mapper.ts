import type { TicketStatus } from '../ticket/ticket.mapper.js';

export type ItemRecord = {
  item_number: number;
  quantity: number;
  subcategory_id: number | undefined;
  category_name: string;
  subcategory_name: string;
  description: string;
  brand_name: string;
  model_number: string;
  serial_number: string;
  amount: number;
  latest_ticket_number: number | undefined;
  latest_ticket_status: TicketStatus | undefined;
  // An item can join a new ticket only when its latest ticket is closed.
  is_loadable: boolean;
  image_path: string;
};

// pg returns BIGINT (item_number) and NUMERIC (amount) as strings; the view
// can return NULLs.
export type ItemRow = {
  item_number: string;
  quantity: number;
  subcategory_id: number | null;
  category_name: string | null;
  subcategory_name: string | null;
  description: string;
  brand_name: string | null;
  model_number: string | null;
  serial_number: string | null;
  amount: string;
  latest_ticket_number: number | null;
  latest_ticket_status: TicketStatus | null;
  image_path: string | null;
};

// item_with_status adds category names and the item's latest ticket.
export const itemSelect = `
  SELECT iws.item_number, iws.quantity, iws.subcategory_id, iws.category_name,
    iws.subcategory_name, iws.description, iws.brand_name, iws.model_number,
    iws.serial_number, iws.amount, iws.latest_ticket_number,
    iws.latest_ticket_status, iws.image_path
  FROM item_with_status iws`;

export const mapItemRow = (row: ItemRow): ItemRecord => {
  const status = row.latest_ticket_status ?? undefined;
  return {
    item_number: Number(row.item_number),
    quantity: row.quantity,
    subcategory_id: row.subcategory_id ?? undefined,
    category_name: row.category_name ?? '',
    subcategory_name: row.subcategory_name ?? '',
    description: row.description,
    brand_name: row.brand_name ?? '',
    model_number: row.model_number ?? '',
    serial_number: row.serial_number ?? '',
    amount: Number(row.amount),
    latest_ticket_number: row.latest_ticket_number ?? undefined,
    latest_ticket_status: status,
    is_loadable: status !== 'pawned' && status !== 'sold',
    image_path: row.image_path ?? '',
  };
};
