import type { Client } from "../../../shared/models/client.model.ts";
import { clientRepo } from "./client.repo.ts";
import { runInTransaction } from "../../shared/runInTransaction.ts";
import { normalizeClientHoldDate } from "../../../shared/utils/clientHold.ts";

export const clientService = {
  setHoldUntil: async (
    clientNumber: number,
    holdUntil: string | null,
  ): Promise<Client> => {
    if (!Number.isSafeInteger(clientNumber) || clientNumber <= 0)
      throw new Error("Select a valid client.");
    const date = normalizeClientHoldDate(holdUntil);
    return runInTransaction("setClientHold", (db) =>
      clientRepo.setHoldUntil(clientNumber, date, db),
    );
  },
  deleteClient: async (clientNumber: number): Promise<boolean> => {
    if (!clientNumber) {
      return false;
    }

    return clientRepo.deleteByNumber(clientNumber);
  },
};
