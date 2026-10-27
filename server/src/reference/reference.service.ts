import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReferenceRepository, type ColorKind } from './reference.repository.js';

@Injectable()
export class ReferenceService {
  constructor(private readonly repository: ReferenceRepository) {}

  loadCities() {
    return this.repository.loadCities();
  }

  loadIdTypes() {
    return this.repository.loadIdTypes();
  }

  loadColors(kind: ColorKind) {
    return this.repository.loadColors(kind);
  }

  loadAllColors(kind: ColorKind) {
    return this.repository.loadAllColors(kind);
  }

  async addColor(kind: ColorKind, input: string) {
    const color = input.trim().toUpperCase();
    const saved = await this.repository.addColor(kind, color);
    if (!saved)
      throw new ConflictException(`That ${kind} color already exists.`);
    return saved;
  }

  async setColorActive(kind: ColorKind, input: string, isActive: boolean) {
    const color = input.trim().toUpperCase();
    const updated = await this.repository.setColorActive(kind, color, isActive);
    if (updated) return updated;
    const existing = await this.repository.findColor(kind, color);
    if (!existing)
      throw new NotFoundException(`That ${kind} color was not found.`);
    throw new ConflictException(
      `That ${kind} color is already ${isActive ? 'active' : 'inactive'}.`,
    );
  }

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

  loadHolidayDates() {
    return this.repository.loadHolidayDates();
  }

  async addHolidayDate(holidayDate: string, name: string) {
    const saved = await this.repository.addHolidayDate(
      holidayDate.trim(),
      name.trim(),
    );
    if (!saved)
      throw new ConflictException('That holiday date has already been added.');
    return saved;
  }

  async deleteHolidayDate(holidayDate: string) {
    const deleted = await this.repository.deleteHolidayDate(holidayDate.trim());
    if (!deleted)
      throw new NotFoundException('That holiday date was not found.');
    return deleted;
  }
}
