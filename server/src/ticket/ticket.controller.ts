import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { fieldValidationPipe } from '../common/field-validation.pipe.js';
import {
  ConvertTicketDto,
  CreatePawnTicketDto,
  CreateSellTicketDto,
  ExtendTicketsDto,
  ListTicketsQueryDto,
  PickupTicketsDto,
  ReverseTicketDto,
  SetStolenDto,
  TicketNumberParamsDto,
  TransferTicketDto,
  UpdateTicketDto,
} from './ticket.dto.js';
import { TicketPaymentService } from './ticket-payment.service.js';
import { TicketStatusService } from './ticket-status.service.js';
import { TicketService } from './ticket.service.js';

// State changes are action sub-resources (POST /tickets/:n/convert, ...):
// each has its own rules and side effects on the client's counters and notes.
@Controller('tickets')
@UsePipes(fieldValidationPipe)
export class TicketController {
  constructor(
    private readonly service: TicketService,
    private readonly payments: TicketPaymentService,
    private readonly statuses: TicketStatusService,
  ) {}

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

  @Post('pickups')
  @HttpCode(200)
  pickup(@Body() input: PickupTicketsDto) {
    return this.payments.pickup(input);
  }

  @Post('extensions')
  @HttpCode(200)
  extend(@Body() input: ExtendTicketsDto) {
    return this.payments.extend(input);
  }

  @Get(':ticketNumber')
  findByNumber(@Param() params: TicketNumberParamsDto) {
    return this.service.findByNumber(params.ticketNumber);
  }

  @Patch(':ticketNumber')
  update(
    @Param() params: TicketNumberParamsDto,
    @Body() input: UpdateTicketDto,
  ) {
    return this.service.update(params.ticketNumber, input);
  }

  @Post(':ticketNumber/convert')
  @HttpCode(200)
  convert(
    @Param() params: TicketNumberParamsDto,
    @Body() input: ConvertTicketDto,
  ) {
    return this.service.convert(params.ticketNumber, input);
  }

  @Get(':ticketNumber/transfer-preview')
  transferPreview(@Param() params: TicketNumberParamsDto) {
    return this.service.transferPreview(params.ticketNumber);
  }

  @Post(':ticketNumber/transfer')
  @HttpCode(200)
  transfer(
    @Param() params: TicketNumberParamsDto,
    @Body() input: TransferTicketDto,
  ) {
    return this.service.transfer(params.ticketNumber, input.client_number);
  }

  @Post(':ticketNumber/expire')
  @HttpCode(200)
  expire(@Param() params: TicketNumberParamsDto) {
    return this.statuses.expire(params.ticketNumber);
  }

  @Patch(':ticketNumber/stolen')
  setStolen(
    @Param() params: TicketNumberParamsDto,
    @Body() input: SetStolenDto,
  ) {
    return this.statuses.setStolen(params.ticketNumber, input);
  }

  @Post(':ticketNumber/reverse')
  @HttpCode(200)
  reverse(
    @Param() params: TicketNumberParamsDto,
    @Body() input: ReverseTicketDto,
  ) {
    return this.statuses.reverse(params.ticketNumber, input);
  }
}
