import type { Client, ID } from "../../../shared/models/client.model.ts";
import type {
  ClientNotesAction,
  SaveClientInput,
} from "../../../shared/payload-contracts/client.contract.ts";

type NormalizedSaveClientInput = {
  client: Client;
  identifications: ID[];
  employee_password: string;
  notes_action: ClientNotesAction;
};

const normalizeName = (value?: string) => value?.trim().toUpperCase() ?? "";

const normalizeClient = (client: Client): Client => ({
  ...client,
  first_name: normalizeName(client.first_name),
  last_name: normalizeName(client.last_name),
  middle_name: normalizeName(client.middle_name),
  gender: client.gender?.trim().toUpperCase() ?? "",
  hair_color: client.hair_color?.trim().toUpperCase() ?? "",
  eye_color: client.eye_color?.trim().toUpperCase() ?? "",
  address: client.address?.trim() ?? "",
  postal_code: client.postal_code?.trim() ?? "",
  city: client.city?.trim() ?? "",
  province: client.province?.trim() ?? "",
  country: client.country?.trim() ?? "",
  email: client.email?.trim() ?? "",
  phone: client.phone?.trim() ?? "",
  notes: client.notes?.trim() ?? "",
  image_path: client.image_path?.trim() ?? "",
});

const normalizeIdentifications = (ids: ID[]): ID[] =>
  (ids ?? [])
    .map((id) => ({
      ...id,
      id_type: id.id_type?.trim() ?? "",
      id_value: id.id_value?.trim() ?? "",
    }))
    .filter((id) => id.id_type && id.id_value);

const validateClient = (client: Client, identifications: ID[]) => {
  const requiredMissing =
    !client.first_name ||
    !client.last_name ||
    !client.date_of_birth ||
    !client.gender ||
    !client.hair_color ||
    !client.eye_color ||
    !client.height_cm ||
    !client.weight_kg ||
    !client.address ||
    !client.city ||
    !client.province ||
    !client.country ||
    !client.image_path;

  if (requiredMissing) {
    throw new Error("Please fill all required client fields before saving.");
  }

  if (identifications.length < 2) {
    throw new Error("Please provide at least two valid ID entries.");
  }
};

const normalizeSaveClient = (
  input: SaveClientInput,
): NormalizedSaveClientInput => ({
  client: normalizeClient(input.client),
  identifications: normalizeIdentifications(input.identifications ?? []),
  employee_password: input.employee_password?.trim() ?? "",
  notes_action: input.notes_action ?? "keep",
});

const normalizeColor = (color: string) => color?.trim() ?? "";

const normalizeDobSearch = (dateOfBirth: string) => dateOfBirth?.trim() ?? "";

export const clientInput = {
  normalizeSaveClient,
  normalizeColor,
  normalizeDobSearch,
  validateClient,
};
