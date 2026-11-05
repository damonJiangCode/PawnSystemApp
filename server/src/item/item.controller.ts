import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { fieldValidationPipe } from '../common/field-validation.pipe.js';
import { TicketNumberParamsDto } from '../ticket/ticket.dto.js';
import {
  CreateItemDto,
  LinkItemsDto,
  SearchItemsQueryDto,
  TicketItemParamsDto,
  UpdateItemDto,
} from './item.dto.js';
import { ItemService } from './item.service.js';

@Controller()
@UsePipes(fieldValidationPipe)
export class ItemController {
  constructor(private readonly service: ItemService) {}

  @Get('tickets/:ticketNumber/items')
  listByTicket(@Param() params: TicketNumberParamsDto) {
    return this.service.listByTicket(params.ticketNumber);
  }

  @Post('tickets/:ticketNumber/items')
  create(@Param() params: TicketNumberParamsDto, @Body() input: CreateItemDto) {
    return this.service.create(params.ticketNumber, input);
  }

  // 200, not 201: no item is created, and repeating the call changes nothing.
  @Post('tickets/:ticketNumber/items/link')
  @HttpCode(200)
  link(@Param() params: TicketNumberParamsDto, @Body() input: LinkItemsDto) {
    return this.service.linkToTicket(params.ticketNumber, input);
  }

  @Patch('tickets/:ticketNumber/items/:itemNumber')
  update(@Param() params: TicketItemParamsDto, @Body() input: UpdateItemDto) {
    return this.service.update(params.ticketNumber, params.itemNumber, input);
  }

  @Delete('tickets/:ticketNumber/items/:itemNumber')
  @HttpCode(204)
  async remove(@Param() params: TicketItemParamsDto) {
    await this.service.removeFromTicket(params.ticketNumber, params.itemNumber);
  }

  @Get('items/search')
  search(@Query() query: SearchItemsQueryDto) {
    return this.service.search(query);
  }
}
