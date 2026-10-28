import { describe, expect, it, vi } from 'vitest';
import { LocationService } from './location.service.js';
import { LocationRepository } from './location.repository.js';

describe('LocationService', () => {
  it('normalizes location codes and descriptions and rejects duplicate codes', async () => {
    const saved = { location: 'AB12', description: 'Shelf A', is_active: true };
    const repository = {
      addLocation: vi
        .fn()
        .mockResolvedValueOnce(saved)
        .mockResolvedValueOnce(null),
    };
    const service = new LocationService(
      repository as unknown as LocationRepository,
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
      const service = new LocationService(
        repository as unknown as LocationRepository,
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
    const service = new LocationService(
      repository as unknown as LocationRepository,
    );
    await expect(service.addLocation('AB12', '')).rejects.toBe(error);
    await expect(service.setLocationActive('AB12', false)).rejects.toBe(error);
    expect(repository.findLocation).not.toHaveBeenCalled();
  });
});
