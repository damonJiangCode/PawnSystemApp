import { describe, expect, it, vi } from 'vitest';
import { IdTypeService } from './id-type.service.js';
import { IdTypeRepository } from './id-type.repository.js';

describe('IdTypeService', () => {
  it('trims new ID types without rewriting their casing and rejects duplicates', async () => {
    const saved = { type: "Driver's License", is_active: true };
    const repository = {
      addIdType: vi
        .fn()
        .mockResolvedValueOnce(saved)
        .mockResolvedValueOnce(null),
    };
    const service = new IdTypeService(
      repository as unknown as IdTypeRepository,
    );
    expect(await service.addIdType("  Driver's License ")).toEqual(saved);
    expect(repository.addIdType).toHaveBeenCalledWith("Driver's License");
    await expect(service.addIdType("driver's license")).rejects.toMatchObject({
      status: 409,
    });
  });

  it.each([true, false])(
    'changes ID type active=%s and distinguishes missing from unchanged',
    async (isActive) => {
      const saved = { type: 'Card', is_active: isActive };
      const repository = {
        setIdTypeActive: vi
          .fn()
          .mockResolvedValueOnce(saved)
          .mockResolvedValue(null),
        findIdType: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(saved),
      };
      const service = new IdTypeService(
        repository as unknown as IdTypeRepository,
      );
      expect(await service.setIdTypeActive(' Card ', isActive)).toEqual(saved);
      expect(repository.setIdTypeActive).toHaveBeenCalledWith('Card', isActive);
      await expect(
        service.setIdTypeActive('missing', isActive),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        service.setIdTypeActive('Card', isActive),
      ).rejects.toMatchObject({ status: 409 });
    },
  );

  it('propagates ID type database errors without substituting business errors', async () => {
    const error = new Error('DB unavailable');
    const repository = {
      addIdType: vi.fn().mockRejectedValue(error),
      setIdTypeActive: vi.fn().mockRejectedValue(error),
      findIdType: vi.fn(),
    };
    const service = new IdTypeService(
      repository as unknown as IdTypeRepository,
    );
    await expect(service.addIdType('Card')).rejects.toBe(error);
    await expect(service.setIdTypeActive('Card', false)).rejects.toBe(error);
    expect(repository.findIdType).not.toHaveBeenCalled();
  });
});
