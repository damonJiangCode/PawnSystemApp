import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { itemSelect, mapItemRow, type ItemRow } from './item.mapper.js';

@Injectable()
export class ItemRepository {
  constructor(private readonly pool: Pool) {}

  async loadByTicketNumber(ticketNumber: number) {
    const result = await this.pool.query<ItemRow>(
      `${itemSelect}
       INNER JOIN ticket_item ti ON ti.item_number = iws.item_number
       WHERE ti.ticket_number = $1
       ORDER BY iws.item_number DESC`,
      [ticketNumber],
    );
    return result.rows.map(mapItemRow);
  }
}
