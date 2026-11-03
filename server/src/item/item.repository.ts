import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import type { SearchItemsQueryDto } from './item.dto.js';
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

  // An item number is exact, so it ignores the other filters except the client.
  async search(filters: SearchItemsQueryDto, limit: number) {
    const conditions: string[] = [];
    const values: Array<number | string> = [];
    const add = (sql: (param: string) => string, value: number | string) => {
      values.push(value);
      conditions.push(sql(`$${values.length}`));
    };

    if (filters.client_number !== undefined) {
      add(
        (p) => `iws.item_number IN (
          SELECT ti.item_number FROM ticket t
          INNER JOIN ticket_item ti ON ti.ticket_number = t.ticket_number
          WHERE t.client_number = ${p})`,
        filters.client_number,
      );
    }
    if (filters.item_number !== undefined) {
      add((p) => `iws.item_number = ${p}`, filters.item_number);
    } else {
      if (filters.category_id !== undefined) {
        add(
          (p) =>
            `iws.category_name = (SELECT name FROM item_category WHERE id = ${p})`,
          filters.category_id,
        );
      }
      if (filters.subcategory_id !== undefined) {
        add((p) => `iws.subcategory_id = ${p}`, filters.subcategory_id);
      }
      if (filters.brand_name) {
        add((p) => `iws.brand_name ILIKE ${p}`, `%${filters.brand_name}%`);
      }
      if (filters.model_number) {
        add((p) => `iws.model_number ILIKE ${p}`, `%${filters.model_number}%`);
      }
      if (filters.serial_number) {
        add(
          (p) => `iws.serial_number ILIKE ${p}`,
          `%${filters.serial_number}%`,
        );
      }
    }
    // No filter would list every item, so an empty search finds nothing.
    if (!conditions.length) return [];
    values.push(limit);

    const result = await this.pool.query<ItemRow>(
      `${itemSelect}
       WHERE ${conditions.join(' AND ')}
       ORDER BY iws.item_number DESC
       LIMIT $${values.length}`,
      values,
    );
    return result.rows.map(mapItemRow);
  }
}
