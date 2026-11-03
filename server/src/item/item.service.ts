import { Injectable } from '@nestjs/common';
import type { SearchItemsQueryDto } from './item.dto.js';
import { ItemRepository } from './item.repository.js';

// The busiest client has under 900 items; a one-letter brand matches 148k.
const SEARCH_LIMIT = 1000;

@Injectable()
export class ItemService {
  constructor(private readonly items: ItemRepository) {}

  // An unknown ticket simply has no items, so this returns [] rather than 404.
  listByTicket(ticketNumber: number) {
    return this.items.loadByTicketNumber(ticketNumber);
  }

  // One extra row tells whether the search found more than the screen shows.
  async search(filters: SearchItemsQueryDto) {
    const rows = await this.items.search(filters, SEARCH_LIMIT + 1);
    return {
      items: rows.slice(0, SEARCH_LIMIT),
      truncated: rows.length > SEARCH_LIMIT,
    };
  }
}
