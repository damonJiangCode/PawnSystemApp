import type { Client, ID } from "../models/client.model.ts";

export type CitiesResponse = {
  provinces: string[];
  citiesByProvince: Record<string, string[]>;
};

export type ClientNotesAction = "keep" | "clear" | "append_signature";

export type SaveClientInput = {
  client: Client;
  identifications: ID[];
  employee_password?: string;
  notes_action?: ClientNotesAction;
};

export type ClientPhotoInput = {
  fileName: string;
  base64: string;
};

export type CreateClientInput = SaveClientInput & {
  photo: ClientPhotoInput;
};
