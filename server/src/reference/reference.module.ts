import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ReferenceController } from './reference.controller.js';
import { ReferenceRepository } from './reference.repository.js';
import { ReferenceService } from './reference.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ReferenceController],
  providers: [ReferenceRepository, ReferenceService],
})
export class ReferenceModule {}
