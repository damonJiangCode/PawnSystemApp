import { Module } from '@nestjs/common';
import { ClientController } from './client.controller.js';
import { ClientService } from './client.service.js';
import { ClientRepository } from './client.repository.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ClientController],
  providers: [ClientService, ClientRepository]
})
export class ClientModule {}
