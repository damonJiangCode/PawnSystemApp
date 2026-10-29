import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { fieldValidationPipe } from '../common/field-validation.pipe.js';
import {
  CreatePawnTicketDto,
  CreateSellTicketDto,
  ListTicketsQueryDto,
  TicketNumberParamsDto,
} from './ticket.dto.js';
import { TicketService } from './ticket.service.js';

@Controller('tickets')
@UsePipes(fieldValidationPipe)
export class TicketController {
  constructor(private readonly service: TicketService) {}

  @Get()
  listByClient(@Query() query: ListTicketsQueryDto) {
    return this.service.listByClient(query.client_number);
  }

  @Post('pawn')
  createPawn(@Body() input: CreatePawnTicketDto) {
    return this.service.createPawn(input);
  }

  @Post('sell')
  createSell(@Body() input: CreateSellTicketDto) {
    return this.service.createSell(input);
  }

  @Get(':ticketNumber')
  findByNumber(@Param() params: TicketNumberParamsDto) {
    return this.service.findByNumber(params.ticketNumber);
  }
}
