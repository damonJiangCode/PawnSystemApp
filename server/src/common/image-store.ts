import {
  BadRequestException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE64 =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export type ImageStoreOptions = {
  // Folder for photos the server saves, and the path prefix stored in the DB.
  root: string;
  prefix: string;
};

// Photos live on disk; the database keeps only a relative path such as
// `images/items/<uuid>.png`, which resolve() maps back to a file in its folder.
export class ImageStore {
  private readonly root: string;
  private readonly createdPath: RegExp;

  constructor(private readonly options: ImageStoreOptions) {
    this.root = path.resolve(options.root);
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

  // Stored paths come from the database, so a bad one means "no such photo"
  // rather than a bad request.
  async resolve(imagePath: string) {
    const notFound = new NotFoundException('Image not found');
    if (!imagePath.startsWith(this.options.prefix)) throw notFound;
    const name = imagePath.slice(this.options.prefix.length);
    if (!name || /[/\\\0]/.test(name) || name === '.' || name === '..') {
      throw notFound;
    }
    // realpath follows symlinks, so a link pointing outside the folder fails.
    try {
      const [basePath, filePath] = await Promise.all([
        realpath(this.root),
        realpath(path.join(this.root, name)),
      ]);
      if (
        path.dirname(filePath) !== basePath ||
        !(await stat(filePath)).isFile()
      ) {
        throw notFound;
      }
      return filePath;
    } catch {
      throw notFound;
    }
  }

  // Migrated photos share this folder; only a UUID name this server created
  // may be deleted, so they stay safe.
  async removeCreated(imagePath: string) {
    if (!this.createdPath.test(imagePath)) {
      throw new BadRequestException('Invalid server-created image path');
    }
    await rm(path.join(this.root, path.basename(imagePath)), { force: true });
  }
}

export const toImageResponse = (file: string) =>
  new StreamableFile(createReadStream(file), {
    type: /\.png$/i.test(file) ? 'image/png' : 'image/jpeg',
  });
