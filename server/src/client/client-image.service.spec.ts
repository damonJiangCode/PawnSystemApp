import { ConfigService } from '@nestjs/config';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClientImageService } from './client-image.service.js';

const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVQAAAABJRU5ErkJggg==';

describe('ClientImageService', () => {
  let root: string;
  let service: ClientImageService;
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'pawn-images-'));
    service = new ClientImageService(
      new ConfigService({
        CLIENT_IMAGE_DIR: path.join(root, 'photos'),
      }),
    );
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('stores server-named images and validates their paths', async () => {
    const imagePath = await service.save(png);
    expect(imagePath).toMatch(/^images\/clients\/[0-9a-f-]+\.png$/);
    expect(await readFile(await service.resolve(imagePath))).toEqual(
      Buffer.from(png, 'base64'),
    );
  });

  it('resolves a migrated photo but never deletes it', async () => {
    const base = path.join(root, 'photos');
    await mkdir(base, { recursive: true });
    const file = path.join(base, '10013_CLIENT.jpg');
    await writeFile(file, Buffer.from(png, 'base64'));
    const imagePath = 'images/clients/10013_CLIENT.jpg';
    expect(await service.resolve(imagePath)).toBe(await realpath(file));
    await expect(service.removeCreatedImage(imagePath)).rejects.toThrow(
      'Invalid',
    );
    await expect(service.resolve(imagePath)).resolves.toBeTruthy();
  });

  it.each([
    'migration/exports/client-photos/client.jpg',
    'database/migration/exports/client-photos/client.jpg',
  ])('does not find the removed migration path: %s', async (value) => {
    await expect(service.resolve(value)).rejects.toThrow('not found');
  });

  it.each(['not base64!', Buffer.from('not an image').toString('base64')])(
    'rejects invalid image content',
    async (value) => {
      await expect(service.save(value)).rejects.toThrow();
    },
  );

  it.each([
    '../../.env',
    'images/clients/../secret.png',
    'images/clients/..\\secret.png',
    '/etc/passwd',
  ])('rejects paths outside photo storage', async (value) => {
    await expect(service.resolve(value)).rejects.toThrow();
  });

  it('rejects symlinks pointing outside storage', async () => {
    const imagePath = await service.save(png);
    const file = await service.resolve(imagePath);
    const outside = path.join(root, 'outside.png');
    await writeFile(outside, Buffer.from(png, 'base64'));
    await rm(file);
    await symlink(outside, file);
    await expect(service.resolve(imagePath)).rejects.toThrow('not found');
  });

  it('removes only the server-created photo supplied by the failed save', async () => {
    const imagePath = await service.save(png);
    const other = await service.save(png);
    await service.removeCreatedImage(imagePath);
    await expect(service.resolve(imagePath)).rejects.toThrow('not found');
    await expect(service.resolve(other)).resolves.toBeTruthy();
  });

  it('rejects deleting arbitrary paths', async () => {
    await expect(service.removeCreatedImage('../../.env')).rejects.toThrow(
      'Invalid',
    );
  });
});
