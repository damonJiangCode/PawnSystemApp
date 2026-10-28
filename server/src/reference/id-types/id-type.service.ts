import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IdTypeRepository } from './id-type.repository.js';

@Injectable()
export class IdTypeService {
  constructor(private readonly repository: IdTypeRepository) {}

  loadIdTypes() {
    return this.repository.loadIdTypes();
  }

  loadAllIdTypes() {
    return this.repository.loadAllIdTypes();
  }

  async addIdType(input: string) {
    const saved = await this.repository.addIdType(input.trim());
    if (!saved) throw new ConflictException('That ID type already exists.');
    return saved;
  }

  async setIdTypeActive(input: string, isActive: boolean) {
    const type = input.trim();
    const updated = await this.repository.setIdTypeActive(type, isActive);
    if (updated) return updated;
    if (!(await this.repository.findIdType(type)))
      throw new NotFoundException('That ID type was not found.');
    throw new ConflictException(
      `That ID type is already ${isActive ? 'active' : 'inactive'}.`,
    );
  }
}
