import type { Ticket } from "../../../shared/models/ticket.model.ts";
import { calculation } from "../../../shared/utils/calculation.ts";
import type {
  ConvertTicketInput,
  ExpireTicketInput,
  MarkTicketStolenInput,
  CreatePawnTicketInput,
  CreateSellTicketInput,
  TicketSearchResult,
  TransferTicketInput,
  TransferTicketPreview,
  UpdateTicketInput,
} from "../../../shared/payload-contracts/ticket.contract.ts";
import { clientRepo } from "../clients/client.repo.ts";
import { ticketRepo } from "./ticket.repo.ts";
import { employeeService } from "../employees/employee.service.ts";
import { ticketInput } from "./ticket.input.ts";
import { createFieldError } from "../../shared/createFieldError.ts";
import { runInTransaction } from "../../shared/runInTransaction.ts";

export const ticketService = {
  loadTickets: async (clientNumber: number): Promise<Ticket[]> => {
    if (!clientNumber) {
      return [];
    }

    return ticketRepo.loadByClientNumber(clientNumber);
  },

  searchTicketByNumber: async (
    ticketNumber: number,
  ): Promise<TicketSearchResult | null> => {
    const normalizedTicketNumber = Number(ticketNumber);

    if (
      !Number.isFinite(normalizedTicketNumber) ||
      normalizedTicketNumber <= 0
    ) {
      throw createFieldError("ticket_number", "Enter a valid ticket number.");
    }

    const ticket = await ticketRepo.loadByTicketNumber(normalizedTicketNumber);

    if (!ticket) {
      return null;
    }

    const client = await clientRepo.loadByNumber(ticket.client_number);

    if (!client) {
      return null;
    }

    return { ticket, client };
  },

  searchPaymentTicketByNumber: async (
    ticketNumber: number,
  ): Promise<TicketSearchResult | null> => {
    return ticketService.searchTicketByNumber(ticketNumber);
  },

  loadTransferTicketPreview: async (
    ticketNumber: number,
  ): Promise<TransferTicketPreview | null> => {
    const normalizedTicketNumber = Number(ticketNumber);

    if (
      !Number.isFinite(normalizedTicketNumber) ||
      normalizedTicketNumber <= 0
    ) {
      throw createFieldError("ticket_number", "Enter a valid ticket number.");
    }

    const preview = await ticketRepo.loadTransferTicketPreview(
      normalizedTicketNumber,
    );
    if (preview) {
      const source = await clientRepo.loadByNumber(
        preview.previous_client_number,
      );
      if (!source?.is_active)
        throw new Error(
          "The source client is deactivated. Reactivate the client before transferring.",
        );
    }
    return preview;
  },

  createPawnTicket: async (input: CreatePawnTicketInput): Promise<Ticket> => {
    const normalizedInput = ticketInput.normalizeCreatePawnTicket(input);

    return runInTransaction("createPawnTicket", async (client) => {
      await clientRepo.assertActiveForTicket(
        [normalizedInput.client_number],
        client,
      );
      const transactionDatetime = calculation.getCurrentDatetime();
      const dueDate = calculation.getDueDatetime(transactionDatetime);
      const employeeName =
        await employeeService.getEmployeeDisplayNameByPassword(
          normalizedInput.employee_password,
          client,
        );

      if (!employeeName) {
        throw createFieldError(
          "employee_password",
          "Employee password is incorrect.",
        );
      }

      const newTicket = await ticketRepo.create(
        {
          transaction_datetime: transactionDatetime,
          is_lost: false,
          location: normalizedInput.location,
          description: normalizedInput.description,
          due_date: dueDate,
          amount: normalizedInput.amount,
          onetime_fee: normalizedInput.onetime_fee,
          employee_name: employeeName,
          status: "pawned",
          client_number: normalizedInput.client_number,
        },
        client,
      );

      return newTicket;
    });
  },

  createSellTicket: async (input: CreateSellTicketInput): Promise<Ticket> => {
    const normalizedInput = ticketInput.normalizeCreateSellTicket(input);

    return runInTransaction("createSellTicket", async (client) => {
      await clientRepo.assertActiveForTicket(
        [normalizedInput.client_number],
        client,
      );
      const transactionDatetime = calculation.getCurrentDatetime();
      const employeeName =
        await employeeService.getEmployeeDisplayNameByPassword(
          normalizedInput.employee_password,
          client,
        );

      if (!employeeName) {
        throw createFieldError(
          "employee_password",
          "Employee password is incorrect.",
        );
      }

      const newTicket = await ticketRepo.create(
        {
          transaction_datetime: transactionDatetime,
          is_lost: false,
          location: normalizedInput.location,
          description: normalizedInput.description,
          due_date: calculation.getSellDueDatetime(transactionDatetime),
          amount: normalizedInput.amount,
          onetime_fee: 0,
          employee_name: employeeName,
          status: "sold",
          client_number: normalizedInput.client_number,
        },
        client,
      );

      await clientRepo.incrementSellCount(
        normalizedInput.client_number,
        client,
      );

      return newTicket;
    });
  },

  updateTicket: async (input: UpdateTicketInput): Promise<Ticket> => {
    const normalizedInput = ticketInput.normalizeUpdateTicket(input);

    return runInTransaction("updateTicket", async (client) => {
      const employeeName =
        await employeeService.getEmployeeDisplayNameByPassword(
          normalizedInput.employee_password,
          client,
        );

      if (!employeeName) {
        throw createFieldError(
          "employee_password",
          "Employee password is incorrect.",
        );
      }

      const existingTicket = await ticketRepo.loadByTicketNumberForUpdate(
        normalizedInput.ticket_number,
        client,
      );

      if (!existingTicket) {
        throw createFieldError("ticket_number", "Ticket was not found.");
      }

      const amountChanged =
        normalizedInput.amount !== Number(existingTicket.amount);
      const pawnTicketOverdue =
        existingTicket.status.startsWith("pawned") &&
        calculation.isBeforeCalendarDate(existingTicket.due_date);

      if (amountChanged && pawnTicketOverdue) {
        throw createFieldError(
          "amount",
          "This ticket is overdue. Its amount cannot be changed.",
        );
      }

      return ticketRepo.update(
        {
          ticket_number: normalizedInput.ticket_number,
          is_lost: normalizedInput.is_lost,
          description: normalizedInput.description,
          location: normalizedInput.location,
          amount: normalizedInput.amount,
          onetime_fee: normalizedInput.onetime_fee,
          partial_payment: normalizedInput.partial_payment,
          employee_name: employeeName,
        },
        client,
      );
    });
  },

  convertTicket: async (input: ConvertTicketInput): Promise<Ticket> => {
    const normalizedInput = ticketInput.normalizeConvertTicket(input);

    return runInTransaction("convertTicket", async (client) => {
      if (
        !Number.isFinite(normalizedInput.ticket_number) ||
        normalizedInput.ticket_number <= 0
      ) {
        throw createFieldError("ticket_number", "Enter a valid ticket number.");
      }

      if (!normalizedInput.description) {
        throw createFieldError("description", "Description is required.");
      }

      if (!normalizedInput.location) {
        throw createFieldError("location", "Location is required.");
      }

      if (
        !Number.isFinite(normalizedInput.amount) ||
        normalizedInput.amount < 0
      ) {
        throw createFieldError("amount", "Amount cannot be negative.");
      }

      if (normalizedInput.onetime_fee < 0) {
        throw createFieldError(
          "onetime_fee",
          "One Time Fee cannot be negative.",
        );
      }

      const employeeName =
        await employeeService.getEmployeeDisplayNameByPassword(
          normalizedInput.employee_password,
          client,
        );

      if (!employeeName) {
        throw createFieldError(
          "employee_password",
          "Employee password is incorrect.",
        );
      }

      const existingTicket = await ticketRepo.loadByTicketNumberForUpdate(
        normalizedInput.ticket_number,
        client,
      );

      if (!existingTicket) {
        throw createFieldError(
          "ticket_number",
          "No ticket was found for that ticket number.",
        );
      }

      if (
        existingTicket.status !== "pawned" &&
        existingTicket.status !== "sold"
      ) {
        throw createFieldError(
          "ticket_number",
          "Only pawned or sold tickets can be converted.",
        );
      }

      if (existingTicket.status === normalizedInput.target_status) {
        throw createFieldError(
          "ticket_number",
          "This ticket is already in the selected target status.",
        );
      }

      const conversionDatetime = calculation.getCurrentDatetime();
      await clientRepo.assertActiveForTicket(
        [existingTicket.client_number],
        client,
      );
      const dueDate =
        normalizedInput.target_status === "pawned"
          ? calculation.getDueDatetime(conversionDatetime)
          : calculation.getSellDueDatetime(conversionDatetime);
      const onetimeFee =
        normalizedInput.target_status === "pawned"
          ? normalizedInput.onetime_fee
          : 0;

      return ticketRepo.convert(
        {
          ticket_number: normalizedInput.ticket_number,
          status: normalizedInput.target_status,
          description: normalizedInput.description,
          location: normalizedInput.location,
          amount: normalizedInput.amount,
          due_date: dueDate,
          onetime_fee: onetimeFee,
          employee_name: employeeName,
        },
        client,
      );
    });
  },

  expireTicket: async (input: ExpireTicketInput): Promise<Ticket> => {
    const normalizedInput = ticketInput.normalizeExpireTicket(input);

    return runInTransaction("expireTicket", async (client) => {
      if (
        !Number.isFinite(normalizedInput.ticket_number) ||
        normalizedInput.ticket_number <= 0
      ) {
        throw createFieldError("ticket_number", "Enter a valid ticket number.");
      }

      const existingTicket = await ticketRepo.loadByTicketNumber(
        normalizedInput.ticket_number,
        client,
      );

      if (!existingTicket) {
        throw createFieldError(
          "ticket_number",
          "No ticket was found for that ticket number.",
        );
      }

      if (
        existingTicket.status !== "pawned" &&
        existingTicket.status !== "sold"
      ) {
        throw createFieldError(
          "ticket_number",
          "Only pawned or sold tickets can be expired.",
        );
      }

      if (!calculation.isBeforeCalendarDate(existingTicket.due_date)) {
        throw createFieldError(
          "ticket_number",
          "Only tickets past the due date can be expired.",
        );
      }

      if (normalizedInput.employee_password !== undefined) {
        const employeeName =
          await employeeService.getEmployeeDisplayNameByPassword(
            normalizedInput.employee_password,
            client,
          );

        if (!employeeName) {
          throw createFieldError(
            "employee_password",
            "Employee password is incorrect.",
          );
        }
      }

      const expiredStatus =
        existingTicket.status === "sold" ? "sold_expired" : "pawned_expired";

      const expiredTicket = await ticketRepo.expire(
        {
          ticket_number: normalizedInput.ticket_number,
          current_status: existingTicket.status,
          current_due_date: existingTicket.due_date,
          status: expiredStatus,
        },
        client,
      );

      await clientRepo.incrementExpireCount(
        expiredTicket.client_number,
        client,
      );

      return expiredTicket;
    });
  },

  markTicketStolen: async (input: MarkTicketStolenInput): Promise<Ticket> => {
    const normalizedInput = ticketInput.normalizeMarkTicketStolen(input);

    return runInTransaction("markTicketStolen", async (client) => {
      if (
        !Number.isFinite(normalizedInput.ticket_number) ||
        normalizedInput.ticket_number <= 0
      ) {
        throw createFieldError("ticket_number", "Enter a valid ticket number.");
      }

      if (!normalizedInput.employee_password) {
        throw createFieldError("employee_password", "Enter employee password.");
      }

      const employeeName =
        await employeeService.getEmployeeDisplayNameByPassword(
          normalizedInput.employee_password,
          client,
        );

      if (!employeeName) {
        throw createFieldError(
          "employee_password",
          "Employee password is incorrect.",
        );
      }

      const existingTicket = await ticketRepo.loadByTicketNumber(
        normalizedInput.ticket_number,
        client,
      );

      if (!existingTicket) {
        throw createFieldError(
          "ticket_number",
          "No ticket was found for that ticket number.",
        );
      }

      return ticketRepo.markStolen(
        {
          ticket_number: normalizedInput.ticket_number,
        },
        client,
      );
    });
  },

  transferTicket: async (input: TransferTicketInput): Promise<Ticket> => {
    const normalizedInput = ticketInput.normalizeTransferTicket(input);

    return runInTransaction("transferTicket", async (client) => {
      if (
        !Number.isFinite(normalizedInput.ticket_number) ||
        normalizedInput.ticket_number <= 0
      ) {
        throw createFieldError("ticket_number", "Enter a valid ticket number.");
      }

      if (
        !Number.isFinite(normalizedInput.client_number) ||
        normalizedInput.client_number <= 0
      ) {
        throw new Error("A client is required to transfer a ticket.");
      }

      const transferPreview = await ticketRepo.loadByTicketNumberForUpdate(
        normalizedInput.ticket_number,
        client,
      );

      if (!transferPreview) {
        throw createFieldError(
          "ticket_number",
          "No ticket was found for that ticket number.",
        );
      }

      if (
        transferPreview.status !== "pawned" &&
        transferPreview.status !== "sold"
      ) {
        throw createFieldError(
          "ticket_number",
          "Only pawned or sold tickets can be transferred.",
        );
      }

      if (transferPreview.client_number === normalizedInput.client_number) {
        throw createFieldError(
          "ticket_number",
          "This ticket already belongs to the selected client.",
        );
      }

      await clientRepo.assertActiveForTicket(
        [transferPreview.client_number, normalizedInput.client_number],
        client,
      );
      return ticketRepo.transfer(
        normalizedInput.ticket_number,
        normalizedInput.client_number,
        client,
      );
    });
  },
};
