import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ItemController } from './item.controller.js';
import { ItemRepository } from './item.repository.js';
import { ItemService } from './item.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ItemController],
  providers: [ItemService, ItemRepository],
})
export class ItemModule {}
