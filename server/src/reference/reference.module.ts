import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ReferenceController } from './reference.controller.js';
import { ReferenceRepository } from './reference.repository.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ReferenceController],
  providers: [ReferenceRepository],
})
export class ReferenceModule {}
