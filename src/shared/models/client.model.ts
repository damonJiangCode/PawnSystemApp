export interface ID {
  id?: number;
  client_number?: number;
  id_type: string;
  id_value: string;
  updated_at?: Date;
}

export interface Client {
  client_number?: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  date_of_birth: Date;
  gender: string;
  hair_color: string;
  eye_color: string;
  height_cm: number | undefined;
  weight_kg: number | undefined;
  address: string;
  postal_code: string;
  city: string;
  province: string;
  country: string;
  email: string;
  phone: string;
  notes: string;
  image_path: string;
  image_updated_at?: Date | null;
  pickup_self_only: boolean;
  is_active: boolean;
  hold_until?: string | null;
  updated_at: Date;
  redeem_count: number;
  sell_count: number;
  expire_count: number;
  overdue_count: number;
  identifications?: ID[];
}
