import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HolidayRepository } from './holiday.repository.js';

@Injectable()
export class HolidayService {
  constructor(private readonly repository: HolidayRepository) {}

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
