import { buildImageUrl } from '../common/image-url.js';

export const mapRowToClient = (row: Record<string, unknown>) => ({
  client_number: Number(row.client_number),
  first_name: row.first_name ? String(row.first_name).toUpperCase() : '',
  last_name: row.last_name ? String(row.last_name).toUpperCase() : '',
  middle_name: row.middle_name ? String(row.middle_name).toUpperCase() : '',
  // DATE columns arrive as YYYY-MM-DD strings (see DatabaseModule).
  date_of_birth: String(row.date_of_birth),
  gender: row.gender ? String(row.gender).toUpperCase() : '',
  hair_color: row.hair_color ? String(row.hair_color).toUpperCase() : '',
  eye_color: row.eye_color ? String(row.eye_color).toUpperCase() : '',
  height_cm: row.height_cm === null ? undefined : Number(row.height_cm),
  weight_kg: row.weight_kg === null ? undefined : Number(row.weight_kg),
  address: String(row.address ?? ''),
  postal_code: String(row.postal_code ?? ''),
  city: String(row.city ?? ''),
  province: String(row.province ?? ''),
  country: String(row.country ?? ''),
  email: String(row.email ?? ''),
  phone: String(row.phone ?? ''),
  notes: String(row.notes ?? ''),
  image_url: buildImageUrl(
    `/clients/${Number(row.client_number)}/image`,
    row.image_path,
  ),
  image_updated_at: row.image_updated_at
    ? (row.image_updated_at as Date)
    : null,
  pickup_self_only: Boolean(row.pickup_self_only),
  is_active: row.is_active !== false,
  hold_until: row.hold_until ? String(row.hold_until) : null,
  updated_at: row.updated_at as Date,
  redeem_count: Number(row.redeem_count ?? 0),
  sell_count: Number(row.sell_count ?? 0),
  expire_count: Number(row.expire_count ?? 0),
  overdue_count: Number(row.overdue_count ?? 0),
  identifications: (row.identifications ?? []) as {
    id: number;
    id_type: string;
    id_value: string;
    updated_at?: Date | string;
  }[],
});
