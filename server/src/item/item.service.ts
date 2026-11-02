import { Injectable } from '@nestjs/common';
import { ItemRepository } from './item.repository.js';

@Injectable()
export class ItemService {
  constructor(private readonly items: ItemRepository) {}

  // An unknown ticket simply has no items, so this returns [] rather than 404.
  listByTicket(ticketNumber: number) {
    return this.items.loadByTicketNumber(ticketNumber);
  }
}
