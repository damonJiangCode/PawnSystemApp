import { Controller, Get, Param, Query, UsePipes } from '@nestjs/common';
import { strictValidationPipe } from '../common/strict-validation.pipe.js';
import { ListTicketsQueryDto, TicketNumberParamsDto } from './ticket.dto.js';
import { TicketService } from './ticket.service.js';

@Controller('tickets')
@UsePipes(strictValidationPipe)
export class TicketController {
  constructor(private readonly service: TicketService) {}

  @Get()
  listByClient(@Query() query: ListTicketsQueryDto) {
    return this.service.listByClient(query.client_number);
  }

  @Get(':ticketNumber')
  findByNumber(@Param() params: TicketNumberParamsDto) {
    return this.service.findByNumber(params.ticketNumber);
  }
}
