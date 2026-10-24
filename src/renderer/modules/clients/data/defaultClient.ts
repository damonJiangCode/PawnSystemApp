import type { Client } from "../../../../shared/models/client.model";

const today = new Date();
const defaultDob = new Date(
  today.getFullYear() - 18,
  today.getMonth(),
  today.getDate(),
);

const defaultClient: Client = {
  first_name: "",
  last_name: "",
  middle_name: "",
  date_of_birth: defaultDob,
  gender: "",
  hair_color: "",
  eye_color: "",
  height_cm: undefined,
  weight_kg: undefined,
  address: "",
  postal_code: "",
  city: "Saskatoon",
  province: "SK",
  country: "Canada",
  email: "",
  phone: "",
  notes: "",
  image_path: "",
  image_updated_at: null,
  pickup_self_only: false,
  is_active: true,
  updated_at: new Date(""),
  redeem_count: 0,
  sell_count: 0,
  expire_count: 0,
  overdue_count: 0,
  identifications: [],
};

export default defaultClient;
