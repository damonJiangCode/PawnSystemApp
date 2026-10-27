import { describe, expect, it, vi } from 'vitest';
import { ReferenceService } from './reference.service.js';
import { ReferenceRepository } from './reference.repository.js';

describe('ReferenceService', () => {
  it('normalizes values and reports duplicate inserts as conflicts', async () => {
    const addColor = vi
      .fn()
      .mockResolvedValueOnce('BLUE')
      .mockResolvedValueOnce(null);
    const service = new ReferenceService({
      addColor,
    } as unknown as ReferenceRepository);
    expect(await service.addColor('hair', ' blue ')).toBe('BLUE');
    expect(addColor).toHaveBeenCalledWith('hair', 'BLUE');
    await expect(service.addColor('hair', 'Blue')).rejects.toMatchObject({
      status: 409,
    });
  });

  it('returns the saved state and distinguishes missing from unchanged colors', async () => {
    const repository = {
      setColorActive: vi
        .fn()
        .mockResolvedValueOnce({ color: 'BLUE', is_active: true })
        .mockResolvedValue(null),
      findColor: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ color: 'BLUE', is_active: true }),
    };
    const service = new ReferenceService(
      repository as unknown as ReferenceRepository,
    );
    expect(await service.setColorActive('eye', ' blue ', true)).toEqual({
      color: 'BLUE',
      is_active: true,
    });
    expect(repository.setColorActive).toHaveBeenCalledWith('eye', 'BLUE', true);
    await expect(
      service.setColorActive('eye', 'missing', true),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service.setColorActive('eye', 'blue', true),
    ).rejects.toMatchObject({
      status: 409,
    });
  });

  it('propagates database failures rather than reporting duplicates or success', async () => {
    const error = new Error('Database unavailable');
    const repository = {
      addColor: vi.fn().mockRejectedValue(error),
      setColorActive: vi.fn().mockRejectedValue(error),
      findColor: vi.fn(),
    };
    const service = new ReferenceService(
      repository as unknown as ReferenceRepository,
    );
    await expect(service.addColor('hair', 'blue')).rejects.toBe(error);
    await expect(service.setColorActive('hair', 'blue', false)).rejects.toBe(
      error,
    );
    expect(repository.findColor).not.toHaveBeenCalled();
  });

  it('normalizes location codes and descriptions and rejects duplicate codes', async () => {
    const saved = { location: 'AB12', description: 'Shelf A', is_active: true };
    const repository = {
      addLocation: vi
        .fn()
        .mockResolvedValueOnce(saved)
        .mockResolvedValueOnce(null),
    };
    const service = new ReferenceService(
      repository as unknown as ReferenceRepository,
    );
    expect(await service.addLocation(' ab12 ', ' Shelf A ')).toEqual(saved);
    expect(repository.addLocation).toHaveBeenCalledWith('AB12', 'Shelf A');
    await expect(service.addLocation('ab12', '')).rejects.toMatchObject({
      status: 409,
    });
  });

  it.each([true, false])(
    'sets location active=%s and distinguishes missing from unchanged state',
    async (isActive) => {
      const saved = { location: 'AB12', description: '', is_active: isActive };
      const repository = {
        setLocationActive: vi
          .fn()
          .mockResolvedValueOnce(saved)
          .mockResolvedValue(null),
        findLocation: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(saved),
      };
      const service = new ReferenceService(
        repository as unknown as ReferenceRepository,
      );
      expect(await service.setLocationActive(' ab12 ', isActive)).toEqual(
        saved,
      );
      expect(repository.setLocationActive).toHaveBeenCalledWith(
        'AB12',
        isActive,
      );
      expect(repository.findLocation).not.toHaveBeenCalled();
      await expect(
        service.setLocationActive('missing', isActive),
      ).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        service.setLocationActive('ab12', isActive),
      ).rejects.toMatchObject({
        status: 409,
      });
    },
  );

  it('propagates location database failures without treating them as a missing code', async () => {
    const error = new Error('Database unavailable');
    const repository = {
      addLocation: vi.fn().mockRejectedValue(error),
      setLocationActive: vi.fn().mockRejectedValue(error),
      findLocation: vi.fn(),
    };
    const service = new ReferenceService(
      repository as unknown as ReferenceRepository,
    );
    await expect(service.addLocation('AB12', '')).rejects.toBe(error);
    await expect(service.setLocationActive('AB12', false)).rejects.toBe(error);
    expect(repository.findLocation).not.toHaveBeenCalled();
  });

  it('trims holiday date/name and reports duplicate dates as conflicts', async () => {
    const saved = { holiday_date: '2026-12-25', name: 'Christmas' };
    const repository = {
      addHolidayDate: vi
        .fn()
        .mockResolvedValueOnce(saved)
        .mockResolvedValueOnce(null),
    };
    const service = new ReferenceService(
      repository as unknown as ReferenceRepository,
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
    const service = new ReferenceService(
      repository as unknown as ReferenceRepository,
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
    const service = new ReferenceService(
      repository as unknown as ReferenceRepository,
    );
    await expect(service.loadHolidayDates()).rejects.toBe(error);
    await expect(
      service.addHolidayDate('2026-12-25', 'Christmas'),
    ).rejects.toBe(error);
    await expect(service.deleteHolidayDate('2026-12-25')).rejects.toBe(error);
  });
});
