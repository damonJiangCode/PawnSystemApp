import { describe, expect, it, vi } from 'vitest';
import { ColorService } from './color.service.js';
import { ColorRepository } from './color.repository.js';

describe('ColorService', () => {
  it('normalizes values and reports duplicate inserts as conflicts', async () => {
    const addColor = vi
      .fn()
      .mockResolvedValueOnce('BLUE')
      .mockResolvedValueOnce(null);
    const service = new ColorService({
      addColor,
    } as unknown as ColorRepository);
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
    const service = new ColorService(repository as unknown as ColorRepository);
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
    const service = new ColorService(repository as unknown as ColorRepository);
    await expect(service.addColor('hair', 'blue')).rejects.toBe(error);
    await expect(service.setColorActive('hair', 'blue', false)).rejects.toBe(
      error,
    );
    expect(repository.findColor).not.toHaveBeenCalled();
  });
});
