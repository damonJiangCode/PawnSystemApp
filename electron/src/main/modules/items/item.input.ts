import type {
  ItemSearchInput,
  SaveItemInput,
} from "../../../../../shared/payload-contracts/item.contract.ts";

const trimUpper = (value?: string) => value?.trim().toUpperCase() ?? "";

const normalizeSaveItem = (input: SaveItemInput): SaveItemInput => ({
  item_number: input.item_number ? Number(input.item_number) : undefined,
  ticket_number: Number(input.ticket_number),
  quantity: Number(input.quantity),
  subcategory_id: Number(input.subcategory_id),
  description: trimUpper(input.description),
  brand_name: trimUpper(input.brand_name),
  model_number: trimUpper(input.model_number),
  serial_number: trimUpper(input.serial_number),
  amount: Number(input.amount),
  image_path: input.image_path?.trim() ?? "",
});

const validateItem = (item: SaveItemInput) => {
  if (!Number.isFinite(item.ticket_number) || item.ticket_number <= 0) {
    throw new Error("A ticket is required.");
  }

  if (!Number.isFinite(item.subcategory_id) || item.subcategory_id <= 0) {
    throw new Error("Select a category.");
  }

  if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
    throw new Error("Quantity must be greater than 0.");
  }

  if (!item.description) {
    throw new Error("Description is required.");
  }

  if (!Number.isFinite(item.amount) || item.amount < 0) {
    throw new Error("Price must be greater than 0.");
  }
};

const normalizeItemSearch = (input: ItemSearchInput): ItemSearchInput => ({
  client_number:
    input.client_number === undefined ? undefined : Number(input.client_number),
  item_number: input.item_number ? Number(input.item_number) : undefined,
  category_id: input.category_id ? Number(input.category_id) : undefined,
  subcategory_id: input.subcategory_id
    ? Number(input.subcategory_id)
    : undefined,
  brand_name: trimUpper(input.brand_name),
  model_number: trimUpper(input.model_number),
  serial_number: trimUpper(input.serial_number),
});

const normalizeTicketItemNumbers = (
  ticketNumber: number,
  itemNumbers: number[],
) => ({
  ticketNumber: Number(ticketNumber),
  itemNumbers: [...new Set(itemNumbers.map(Number))].filter(
    (itemNumber) => Number.isFinite(itemNumber) && itemNumber > 0,
  ),
});

export const itemInput = {
  normalizeSaveItem,
  validateItem,
  normalizeItemSearch,
  normalizeTicketItemNumbers,
};
