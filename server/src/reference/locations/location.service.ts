import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LocationRepository } from './location.repository.js';

@Injectable()
export class LocationService {
  constructor(private readonly repository: LocationRepository) {}

  loadLocations() {
    return this.repository.loadLocations();
  }

  loadAllLocations() {
    return this.repository.loadAllLocations();
  }

  async addLocation(input: string, description: string) {
    const location = input.trim().toUpperCase();
    const saved = await this.repository.addLocation(
      location,
      description.trim(),
    );
    if (!saved)
      throw new ConflictException('That location code already exists.');
    return saved;
  }

  async setLocationActive(input: string, isActive: boolean) {
    const location = input.trim().toUpperCase();
    const updated = await this.repository.setLocationActive(location, isActive);
    if (updated) return updated;
    const existing = await this.repository.findLocation(location);
    if (!existing) throw new NotFoundException('That location was not found.');
    throw new ConflictException(
      `That location is already ${isActive ? 'active' : 'inactive'}.`,
    );
  }
}
