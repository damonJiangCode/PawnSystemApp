import type { Client } from "../../../shared/models/client.model.ts";
import type {
  ClientNotesAction,
  SaveClientInput,
} from "../../../shared/payload-contracts/client.contract.ts";
import { clientIdRepo } from "./client-id.repo.ts";
import { clientRepo } from "./client.repo.ts";
import { employeeService } from "../employees/employee.service.ts";
import { clientInput } from "./client.input.ts";
import { createFieldError } from "../../shared/createFieldError.ts";
import { imageStorage } from "../../shared/imageStorage.ts";
import { runInTransaction } from "../../shared/runInTransaction.ts";
import type { DbClient } from "../../database/connection.ts";
import { normalizeClientHoldDate } from "../../../shared/utils/clientHold.ts";

const resolveNotes = async (
  client: Client,
  notesAction: ClientNotesAction,
  employeePassword: string,
  dbClient: DbClient,
): Promise<string> => {
  if (notesAction === "clear") {
    return "";
  }

  if (notesAction !== "append_signature") {
    return client.notes;
  }

  if (!employeePassword) {
    throw createFieldError(
      "employee_password",
      "Employee password is required.",
    );
  }

  const employee = await employeeService.findByPassword(
    employeePassword,
    dbClient,
  );

  if (!employee) {
    throw createFieldError(
      "employee_password",
      "Employee password is incorrect.",
    );
  }

  if (!client.notes) {
    return "";
  }

  const formattedDate = new Date().toLocaleDateString("en-CA");
  return `${client.notes} (${employee.first_name}, ${formattedDate})`;
};

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
  saveClientImage: async (
    fileName: string,
    base64: string,
  ): Promise<string> => {
    return imageStorage.saveClientImage(fileName, base64);
  },

  createClient: async (input: SaveClientInput): Promise<Client> => {
    const normalizedInput = clientInput.normalizeSaveClient(input);
    clientInput.validateClient(
      normalizedInput.client,
      normalizedInput.identifications,
    );

    if (
      normalizedInput.client.notes &&
      normalizedInput.notes_action !== "append_signature"
    ) {
      throw new Error("Notes require employee authorization before saving.");
    }

    return runInTransaction("createClient", async (client) => {
      const nextNotes = await resolveNotes(
        normalizedInput.client,
        normalizedInput.notes_action,
        normalizedInput.employee_password,
        client,
      );

      const preparedClient = {
        ...normalizedInput.client,
        notes: nextNotes,
      };

      const insertedClient = await clientRepo.create(preparedClient, client);
      const imagePath = preparedClient.image_path
        ? await imageStorage.finalizeClientImage(
            insertedClient.client_number,
            preparedClient.image_path,
          )
        : "";

      if (imagePath && imagePath !== preparedClient.image_path) {
        await clientRepo.updateImagePath(
          insertedClient.client_number,
          imagePath,
          client,
        );
      }

      const insertedIds = await clientIdRepo.insertIds(
        insertedClient.client_number,
        normalizedInput.identifications,
        client,
      );

      return {
        ...preparedClient,
        image_path: imagePath || preparedClient.image_path,
        client_number: insertedClient.client_number,
        updated_at: insertedClient.updated_at,
        identifications: insertedIds,
      };
    });
  },

  updateClient: async (input: SaveClientInput): Promise<Client> => {
    const normalizedInput = clientInput.normalizeSaveClient(input);
    clientInput.validateClient(
      normalizedInput.client,
      normalizedInput.identifications,
    );

    if (!normalizedInput.client.client_number) {
      throw new Error("Missing client number for update.");
    }

    return runInTransaction("updateClient", async (client) => {
      const nextNotes = await resolveNotes(
        normalizedInput.client,
        normalizedInput.notes_action,
        normalizedInput.employee_password,
        client,
      );

      const preparedClient = {
        ...normalizedInput.client,
        notes: nextNotes,
      };

      const imagePath = preparedClient.image_path
        ? await imageStorage.finalizeClientImage(
            preparedClient.client_number as number,
            preparedClient.image_path,
          )
        : "";
      const preparedClientWithImage = {
        ...preparedClient,
        image_path: imagePath || preparedClient.image_path,
      };

      const updatedClient = await clientRepo.update(
        preparedClientWithImage,
        client,
      );
      await clientIdRepo.deleteIds(
        preparedClientWithImage.client_number as number,
        client,
      );
      const insertedIds = await clientIdRepo.insertIds(
        preparedClientWithImage.client_number as number,
        normalizedInput.identifications,
        client,
      );

      return {
        ...preparedClientWithImage,
        updated_at: updatedClient.updated_at,
        identifications: insertedIds,
      };
    });
  },

  deleteClient: async (clientNumber: number): Promise<boolean> => {
    if (!clientNumber) {
      return false;
    }

    return clientRepo.deleteByNumber(clientNumber);
  },
};
