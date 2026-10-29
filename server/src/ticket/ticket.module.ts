import { Module } from '@nestjs/common';
import { ClientModule } from '../client/client.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { EmployeeModule } from '../employee/employee.module.js';
import { ReferenceModule } from '../reference/reference.module.js';
import { TicketController } from './ticket.controller.js';
import { TicketRepository } from './ticket.repository.js';
import { TicketService } from './ticket.service.js';

@Module({
  imports: [DatabaseModule, ClientModule, EmployeeModule, ReferenceModule],
  controllers: [TicketController],
  providers: [TicketService, TicketRepository],
})
export class TicketModule {}
