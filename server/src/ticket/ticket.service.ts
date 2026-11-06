import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Pool } from 'pg';
import { ClientRepository } from '../client/client.repository.js';
import { inTransaction } from '../common/transaction.js';
import type {
  ConvertTicketDto,
  CreatePawnTicketDto,
  CreateSellTicketDto,
  UpdateTicketDto,
} from './ticket.dto.js';
import {
  getPawnDueDatetime,
  getSellDueDatetime,
  isBeforeShopDate,
} from './ticket-finance.js';
import type { TicketRecord } from './ticket.mapper.js';
import { TicketRepository } from './ticket.repository.js';
import {
  TicketSupport,
  ticketConflict,
  ticketNotFound,
} from './ticket-support.js';

const sellAmountRequired = () =>
  new BadRequestException({
    field: 'amount',
    message: 'Amount must be greater than 0.',
  });

const isOpen = (ticket: TicketRecord) =>
  ticket.status === 'pawned' || ticket.status === 'sold';

@Injectable()
export class TicketService {
  constructor(
    private readonly pool: Pool,
    private readonly tickets: TicketRepository,
    private readonly clients: ClientRepository,
    private readonly support: TicketSupport,
  ) {}

  async listByClient(clientNumber: number) {
    return this.support.present(
      await this.tickets.loadByClientNumber(clientNumber),
    );
  }

  async findByNumber(ticketNumber: number) {
    const ticket = await this.tickets.loadByTicketNumber(ticketNumber);
    if (!ticket) throw ticketNotFound();
    const client = await this.clients.loadByNumber(ticket.client_number);
    if (!client) throw ticketNotFound();
    const [presented] = await this.support.present([ticket]);
    return { ticket: presented, client };
  }

  createPawn(input: CreatePawnTicketDto) {
    return this.issue(input, (now) => ({
      status: 'pawned',
      due_date: getPawnDueDatetime(now),
      onetime_fee: input.onetime_fee,
    }));
  }

  createSell(input: CreateSellTicketDto) {
    return this.issue(input, (now) => ({
      status: 'sold',
      due_date: getSellDueDatetime(now),
      onetime_fee: 0,
    }));
  }

  // Edit keeps today's behavior of recording the editor as the employee.
  async update(ticketNumber: number, input: UpdateTicketDto) {
    const ticket = await inTransaction(this.pool, async (connection) => {
      const existing = await this.support.requireTicketForUpdate(
        ticketNumber,
        connection,
      );
      if (!isOpen(existing)) {
        throw ticketConflict('Only pawned or sold tickets can be edited.');
      }
      const isSold = existing.status === 'sold';
      if (isSold && input.amount <= 0) throw sellAmountRequired();
      if (
        existing.status === 'pawned' &&
        input.amount !== existing.amount &&
        isBeforeShopDate(existing.due_date)
      ) {
        throw ticketConflict(
          'This ticket is overdue. Its amount cannot be changed.',
          'amount',
        );
      }
      await this.support.assertLocation(
        input.location,
        connection,
        existing.location,
      );
      const employeeName = await this.support.ticketEmployeeName(
        input.employee_password,
        connection,
      );
      await this.tickets.update(
        ticketNumber,
        {
          is_lost: input.is_lost,
          location: input.location,
          description: input.description,
          amount: input.amount,
          // Sold tickets never carry a one-time fee.
          onetime_fee: isSold ? 0 : input.onetime_fee,
          employee_name: employeeName,
        },
        connection,
      );
      return this.support.reload(ticketNumber, connection);
    });
    const [presented] = await this.support.present([ticket]);
    return presented;
  }

  // Converting corrects a pawn/sell choice: the server sets the new due date
  // and fee, and moves the client's sell count with the ticket.
  async convert(ticketNumber: number, input: ConvertTicketDto) {
    const ticket = await inTransaction(this.pool, async (connection) => {
      const existing = await this.support.requireTicketForUpdate(
        ticketNumber,
        connection,
      );
      if (!isOpen(existing)) {
        throw ticketConflict('Only pawned or sold tickets can be converted.');
      }
      if (existing.status === input.target_status) {
        throw ticketConflict(
          'This ticket is already in the selected target status.',
        );
      }
      const toSold = input.target_status === 'sold';
      if (toSold && input.amount <= 0) throw sellAmountRequired();
      await this.support.assertClientActive(existing.client_number, connection);
      await this.support.assertLocation(
        input.location,
        connection,
        existing.location,
      );
      const employeeName = await this.support.ticketEmployeeName(
        input.employee_password,
        connection,
      );
      const now = new Date();
      await this.tickets.convert(
        ticketNumber,
        {
          status: input.target_status,
          location: input.location,
          description: input.description,
          amount: input.amount,
          onetime_fee: toSold ? 0 : input.onetime_fee,
          due_date: toSold ? getSellDueDatetime(now) : getPawnDueDatetime(now),
          employee_name: employeeName,
          converted_at: now,
        },
        connection,
      );
      await this.clients.adjustCount(
        existing.client_number,
        'sell_count',
        toSold ? 1 : -1,
        connection,
      );
      return this.support.reload(ticketNumber, connection);
    });
    const [presented] = await this.support.present([ticket]);
    return presented;
  }

  async transferPreview(ticketNumber: number) {
    const preview = await this.tickets.loadTransferPreview(ticketNumber);
    if (!preview) throw ticketNotFound();
    const { previous_client_is_active, ...rest } = preview;
    if (!previous_client_is_active) {
      throw new ConflictException(
        'The source client is deactivated. Reactivate the client before transferring.',
      );
    }
    return rest;
  }

  async transfer(ticketNumber: number, clientNumber: number) {
    const ticket = await inTransaction(this.pool, async (connection) => {
      const existing = await this.support.requireTicketForUpdate(
        ticketNumber,
        connection,
      );
      if (!isOpen(existing)) {
        throw ticketConflict('Only pawned or sold tickets can be transferred.');
      }
      if (existing.client_number === clientNumber) {
        throw ticketConflict(
          'This ticket already belongs to the selected client.',
        );
      }
      // Both clients locked in number order so concurrent transfers between
      // the same two clients cannot deadlock.
      for (const number of [existing.client_number, clientNumber].sort(
        (a, b) => a - b,
      )) {
        await this.support.assertClientActive(number, connection);
      }
      await this.tickets.transfer(ticketNumber, clientNumber, connection);
      return this.support.reload(ticketNumber, connection);
    });
    const [presented] = await this.support.present([ticket]);
    return presented;
  }

  // Shared pawn/sell issuing: client lock, location and PIN checks, insert,
  // and the sell counter all commit or roll back together.
  private async issue(
    input: CreatePawnTicketDto | CreateSellTicketDto,
    terms: (
      now: Date,
    ) => Pick<TicketRecord, 'status' | 'due_date' | 'onetime_fee'>,
  ) {
    const ticket = await inTransaction(this.pool, async (connection) => {
      await this.support.assertClientActive(input.client_number, connection);
      await this.support.assertLocation(input.location, connection);
      const employeeName = await this.support.ticketEmployeeName(
        input.employee_password,
        connection,
      );
      const now = new Date();
      const { status, due_date, onetime_fee } = terms(now);
      const ticketNumber = await this.tickets.create(
        {
          transaction_datetime: now,
          location: input.location,
          description: input.description,
          due_date,
          amount: input.amount,
          onetime_fee,
          employee_name: employeeName,
          status,
          client_number: input.client_number,
        },
        connection,
      );
      if (status === 'sold') {
        await this.clients.adjustCount(
          input.client_number,
          'sell_count',
          1,
          connection,
        );
      }
      return this.support.reload(ticketNumber, connection);
    });
    const [presented] = await this.support.present([ticket]);
    return presented;
  }
}
