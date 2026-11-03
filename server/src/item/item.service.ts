import { BadRequestException, Injectable } from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import { inTransaction } from '../common/transaction.js';
import { ticketConflict, ticketNotFound } from '../ticket/ticket-support.js';
import type { CreateItemDto, SearchItemsQueryDto } from './item.dto.js';
import { ItemImageService } from './item-image.service.js';
import { ItemRepository } from './item.repository.js';

// The busiest client has under 900 items; a one-letter brand matches 148k.
const SEARCH_LIMIT = 1000;

@Injectable()
export class ItemService {
  constructor(
    private readonly pool: Pool,
    private readonly items: ItemRepository,
    private readonly images: ItemImageService,
  ) {}

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

  async create(ticketNumber: number, input: CreateItemDto) {
    const { photo, ...item } = input;
    return inTransaction(this.pool, async (connection) => {
      await this.requireOpenTicket(ticketNumber, connection);
      await this.requireActiveSubcategory(item.subcategory_id, connection);
      // Saved after the checks, so a rejected request leaves no file behind.
      const imagePath = await this.images.save(photo.base64);
      try {
        const itemNumber = await this.items.insert(item, imagePath, connection);
        await this.items.linkToTicket(ticketNumber, itemNumber, connection);
        const created = await this.items.loadByItemNumber(
          itemNumber,
          connection,
        );
        if (!created) throw new Error(`Item #${itemNumber} vanished.`);
        return created;
      } catch (error) {
        // Rollback undoes the rows but not the file, so remove it here. A
        // failed COMMIT keeps the file: the rows may have been saved.
        await this.images.removeCreatedImage(imagePath).catch(() => {
          console.error('Could not clean up a failed item photo');
        });
        throw error;
      }
    });
  }

  private async requireOpenTicket(
    ticketNumber: number,
    connection: PoolClient,
  ) {
    const status = await this.items.lockTicketStatus(ticketNumber, connection);
    if (!status) throw ticketNotFound(ticketNumber);
    if (status !== 'pawned' && status !== 'sold') {
      throw ticketConflict(
        'Items can only be changed on pawned or sold tickets.',
      );
    }
  }

  private async requireActiveSubcategory(
    subcategoryId: number,
    connection: PoolClient,
  ) {
    const isActive = await this.items.loadSubcategoryActive(
      subcategoryId,
      connection,
    );
    if (!isActive) {
      throw new BadRequestException({
        field: 'subcategory_id',
        message:
          isActive === null
            ? 'Select a category.'
            : 'Select an active category.',
      });
    }
  }
}
