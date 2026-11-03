import { Controller, Get, Param, Query, UsePipes } from '@nestjs/common';
import { fieldValidationPipe } from '../common/field-validation.pipe.js';
import { TicketNumberParamsDto } from '../ticket/ticket.dto.js';
import { SearchItemsQueryDto } from './item.dto.js';
import { ItemService } from './item.service.js';

@Controller()
@UsePipes(fieldValidationPipe)
export class ItemController {
  constructor(private readonly service: ItemService) {}

  @Get('tickets/:ticketNumber/items')
  listByTicket(@Param() params: TicketNumberParamsDto) {
    return this.service.listByTicket(params.ticketNumber);
  }

  @Get('items/search')
  search(@Query() query: SearchItemsQueryDto) {
    return this.service.search(query);
  }
}
