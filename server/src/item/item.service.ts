import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import { inTransaction } from '../common/transaction.js';
import { ticketConflict, ticketNotFound } from '../ticket/ticket-support.js';
import type {
  CreateItemDto,
  SearchItemsQueryDto,
  UpdateItemDto,
} from './item.dto.js';
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
      const imagePath = await this.images.save(photo.base64);
      return this.cleanUpImageOnError(imagePath, async () => {
        const itemNumber = await this.items.insert(item, imagePath, connection);
        await this.items.linkToTicket(ticketNumber, itemNumber, connection);
        return this.loadSaved(itemNumber, connection);
      });
    });
  }

  async update(ticketNumber: number, itemNumber: number, input: UpdateItemDto) {
    const { photo, ...item } = input;
    return inTransaction(this.pool, async (connection) => {
      await this.requireOpenTicket(ticketNumber, connection);
      const currentSubcategoryId = await this.requireTicketItem(
        ticketNumber,
        itemNumber,
        connection,
      );
      // An item may keep a category that was deactivated after it was saved.
      if (item.subcategory_id !== currentSubcategoryId) {
        await this.requireActiveSubcategory(item.subcategory_id, connection);
      }
      // The old photo file stays, like client photos: deleting it cannot be
      // undone if the transaction fails afterwards.
      const imagePath = photo ? await this.images.save(photo.base64) : null;
      return this.cleanUpImageOnError(imagePath, async () => {
        await this.items.update(itemNumber, item, imagePath, connection);
        return this.loadSaved(itemNumber, connection);
      });
    });
  }

  // Only the link goes: the item and its photo may still be on other tickets.
  async removeFromTicket(ticketNumber: number, itemNumber: number) {
    await inTransaction(this.pool, async (connection) => {
      await this.requireOpenTicket(ticketNumber, connection);
      await this.requireTicketItem(ticketNumber, itemNumber, connection);
      await this.items.unlinkFromTicket(ticketNumber, itemNumber, connection);
    });
  }

  // Rollback undoes the rows but not the file, so remove a new photo here. A
  // failed COMMIT keeps the file: the rows may have been saved.
  private async cleanUpImageOnError<T>(
    imagePath: string | null,
    write: () => Promise<T>,
  ) {
    try {
      return await write();
    } catch (error) {
      if (imagePath) {
        await this.images.removeCreatedImage(imagePath).catch(() => {
          console.error('Could not clean up a failed item photo');
        });
      }
      throw error;
    }
  }

  private async loadSaved(itemNumber: number, connection: PoolClient) {
    const item = await this.items.loadByItemNumber(itemNumber, connection);
    if (!item) throw new Error(`Item #${itemNumber} vanished.`);
    return item;
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

  private async requireTicketItem(
    ticketNumber: number,
    itemNumber: number,
    connection: PoolClient,
  ) {
    const subcategoryId = await this.items.lockTicketItem(
      ticketNumber,
      itemNumber,
      connection,
    );
    if (subcategoryId === null) {
      throw new NotFoundException({
        field: 'item_number',
        message: `Item #${itemNumber} is not on ticket #${ticketNumber}.`,
      });
    }
    return subcategoryId;
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
