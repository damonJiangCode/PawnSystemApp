import type { Client } from "../models/client.model.ts";
import type { HairColor } from "../models/hair-color.model.ts";
import type { EyeColor } from "../models/eye-color.model.ts";
import type {
  CitiesResponse,
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
  loadCities: () => Promise<CitiesResponse>;
  loadHairColors: () => Promise<string[]>;
  loadHairColorsForAdmin: () => Promise<HairColor[]>;
  loadEyeColors: () => Promise<string[]>;
  loadEyeColorsForAdmin: () => Promise<EyeColor[]>;
  addHairColor: (color: string) => Promise<string>;
  activateHairColor: (color: string) => Promise<HairColor>;
  deactivateHairColor: (color: string) => Promise<HairColor>;
  addEyeColor: (color: string) => Promise<string>;
  activateEyeColor: (color: string) => Promise<EyeColor>;
  deactivateEyeColor: (color: string) => Promise<EyeColor>;
  loadIdTypes: () => Promise<string[]>;
  createClient: (input: CreateClientInput) => Promise<Client>;
  updateClient: (input: UpdateClientInput) => Promise<Client>;
};
