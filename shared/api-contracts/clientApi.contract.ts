import type { Client } from "../models/client.model.ts";
import type {
  UpdateClientInput,
  CreateClientInput,
} from "../payload-contracts/client.contract.ts";

export type ClientApi = {
  setHoldUntil: (
    clientNumber: number,
    holdUntil: string | null,
    employeePassword?: string,
  ) => Promise<Client>;
  searchClients: (firstName: string, lastName: string) => Promise<Client[]>;
  searchClientsByDob: (dateOfBirth: string) => Promise<Client[]>;
  createClient: (input: CreateClientInput) => Promise<Client>;
  updateClient: (input: UpdateClientInput) => Promise<Client>;
};
