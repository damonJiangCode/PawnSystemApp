import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ItemImageService } from './item-image.service.js';
import { ItemController } from './item.controller.js';
import { ItemRepository } from './item.repository.js';
import { ItemService } from './item.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ItemController],
  providers: [ItemService, ItemRepository, ItemImageService],
})
export class ItemModule {}
