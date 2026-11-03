import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE64 =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export type ImageStoreOptions = {
  // Folder for photos the server saves, and the path prefix stored in the DB.
  root: string;
  prefix: string;
  // Folder of photos exported by the legacy import, and the DB prefixes for it.
  migrationRoot: string;
  migrationPrefixes: string[];
};

// Photos live on disk; the database keeps only a relative path such as
// `images/items/<uuid>.png`, which resolve() maps back to a file in its folder.
export class ImageStore {
  private readonly root: string;
  private readonly migrationRoot: string;
  private readonly createdPath: RegExp;

  constructor(private readonly options: ImageStoreOptions) {
    this.root = path.resolve(options.root);
    this.migrationRoot = path.resolve(options.migrationRoot);
    const prefix = options.prefix.replace(/[/.]/g, '\\$&');
    this.createdPath = new RegExp(`^${prefix}[0-9a-f-]{36}\\.(png|jpg)$`);
  }

  async save(base64: string) {
    if (!BASE64.test(base64)) {
      throw new BadRequestException('Invalid base64 image');
    }
    const buffer = Buffer.from(base64, 'base64');
    const isPng = buffer.subarray(0, 8).equals(PNG_SIGNATURE);
    const isJpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    if (
      !buffer.length ||
      buffer.length > 5 * 1024 * 1024 ||
      (!isPng && !isJpeg)
    ) {
      throw new BadRequestException('Upload a PNG or JPEG image up to 5 MB');
    }
    const fileName = `${randomUUID()}.${isPng ? 'png' : 'jpg'}`;
    await mkdir(this.root, { recursive: true });
    const filePath = path.join(this.root, fileName);
    try {
      await writeFile(filePath, buffer, { flag: 'wx' });
    } catch (error) {
      if ((error as { code?: string }).code !== 'EEXIST') {
        await rm(filePath, { force: true }).catch(() => {
          console.error('Could not clean up an incomplete photo');
        });
      }
      throw error;
    }
    return `${this.options.prefix}${fileName}`;
  }

  async resolve(imagePath: string) {
    let base: string;
    let name: string;
    const migrationPrefix = this.options.migrationPrefixes.find((prefix) =>
      imagePath.startsWith(prefix),
    );
    if (imagePath.startsWith(this.options.prefix)) {
      base = this.root;
      name = imagePath.slice(this.options.prefix.length);
    } else if (migrationPrefix) {
      base = this.migrationRoot;
      name = imagePath.slice(migrationPrefix.length);
    } else {
      throw new BadRequestException('Invalid image path');
    }
    if (!name || /[/\\\0]/.test(name) || name === '.' || name === '..') {
      throw new BadRequestException('Invalid image path');
    }
    // realpath follows symlinks, so a link pointing outside the folder fails.
    try {
      const [basePath, filePath] = await Promise.all([
        realpath(base),
        realpath(path.join(base, name)),
      ]);
      if (
        path.dirname(filePath) !== basePath ||
        !(await stat(filePath)).isFile()
      ) {
        throw new NotFoundException('Image not found');
      }
      return filePath;
    } catch {
      throw new NotFoundException('Image not found');
    }
  }

  // Only a photo this server just saved may be deleted, never a legacy one.
  async removeCreated(imagePath: string) {
    if (!this.createdPath.test(imagePath)) {
      throw new BadRequestException('Invalid server-created image path');
    }
    await rm(path.join(this.root, path.basename(imagePath)), { force: true });
  }
}
