import { clientRepo } from "./client.repo.ts";

export const clientService = {
  deleteClient: async (clientNumber: number): Promise<boolean> => {
    if (!clientNumber) {
      return false;
    }

    return clientRepo.deleteByNumber(clientNumber);
  },
};
