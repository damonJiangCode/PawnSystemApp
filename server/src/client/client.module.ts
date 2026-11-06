import { Module } from '@nestjs/common';
import { ClientController } from './client.controller.js';
import { ClientService } from './client.service.js';
import { ClientRepository } from './client.repository.js';
import { DatabaseModule } from '../database/database.module.js';
import { EmployeeModule } from '../employee/employee.module.js';
import { ClientImageService } from './client-image.service.js';

@Module({
  imports: [DatabaseModule, EmployeeModule],
  controllers: [ClientController],
  providers: [ClientService, ClientRepository, ClientImageService],
  exports: [ClientRepository],
})
export class ClientModule {}
