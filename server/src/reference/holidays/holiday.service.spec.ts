import { describe, expect, it, vi } from 'vitest';
import { HolidayService } from './holiday.service.js';
import { HolidayRepository } from './holiday.repository.js';

describe('HolidayService', () => {
  it('trims holiday date/name and reports duplicate dates as conflicts', async () => {
    const saved = { holiday_date: '2026-12-25', name: 'Christmas' };
    const repository = {
      addHolidayDate: vi
        .fn()
        .mockResolvedValueOnce(saved)
        .mockResolvedValueOnce(null),
    };
    const service = new HolidayService(
      repository as unknown as HolidayRepository,
    );
    expect(await service.addHolidayDate(' 2026-12-25 ', ' Christmas ')).toEqual(
      saved,
    );
    expect(repository.addHolidayDate).toHaveBeenCalledWith(
      '2026-12-25',
      'Christmas',
    );
    await expect(
      service.addHolidayDate('2026-12-25', 'Other'),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('returns the removed holiday and reports missing dates as not found', async () => {
    const saved = { holiday_date: '2026-12-25', name: 'Christmas' };
    const repository = {
      deleteHolidayDate: vi
        .fn()
        .mockResolvedValueOnce(saved)
        .mockResolvedValueOnce(null),
    };
    const service = new HolidayService(
      repository as unknown as HolidayRepository,
    );
    expect(await service.deleteHolidayDate(' 2026-12-25 ')).toEqual(saved);
    expect(repository.deleteHolidayDate).toHaveBeenCalledWith('2026-12-25');
    await expect(service.deleteHolidayDate('2026-12-25')).rejects.toMatchObject(
      { status: 404 },
    );
  });

  it('propagates holiday database failures without claiming duplicate or missing dates', async () => {
    const error = new Error('Database unavailable');
    const repository = {
      loadHolidayDates: vi.fn().mockRejectedValue(error),
      addHolidayDate: vi.fn().mockRejectedValue(error),
      deleteHolidayDate: vi.fn().mockRejectedValue(error),
    };
    const service = new HolidayService(
      repository as unknown as HolidayRepository,
    );
    await expect(service.loadHolidayDates()).rejects.toBe(error);
    await expect(
      service.addHolidayDate('2026-12-25', 'Christmas'),
    ).rejects.toBe(error);
    await expect(service.deleteHolidayDate('2026-12-25')).rejects.toBe(error);
  });
});
