export type SaveItemInput = {
  item_number?: number;
  ticket_number: number;
  quantity: number;
  subcategory_id: number;
  description: string;
  brand_name: string;
  model_number: string;
  serial_number: string;
  amount: number;
  image_path?: string;
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
