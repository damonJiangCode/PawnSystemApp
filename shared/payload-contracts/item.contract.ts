import type { Item } from "../models/item.model.ts";

type ItemFields = {
  ticket_number: number;
  quantity: number;
  subcategory_id: number;
  description: string;
  brand_name: string;
  model_number: string;
  serial_number: string;
  amount: number;
};

export type ItemPhotoInput = {
  fileName: string;
  base64: string;
};

export type CreateItemInput = ItemFields & {
  photo: ItemPhotoInput;
};

export type UpdateItemInput = ItemFields & {
  item_number: number;
  photo?: ItemPhotoInput;
};

export type ItemSearchInput = {
  client_number?: number;
  item_number?: number;
  category_id?: number;
  subcategory_id?: number;
  brand_name?: string;
  model_number?: string;
  serial_number?: string;
};

export type ItemSearchResult = {
  items: Item[];
  truncated: boolean;
};
