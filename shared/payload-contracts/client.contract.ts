import type { Client, ID } from "../models/client.model.ts";

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

export type UpdateClientInput = {
  client: Partial<Client> & { client_number: number };
  identifications?: ID[];
  photo?: ClientPhotoInput;
  employee_password?: string;
  notes_action?: ClientNotesAction;
};
