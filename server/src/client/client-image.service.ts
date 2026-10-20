import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

@Injectable()
export class ClientImageService {
  private readonly root: string;
  private readonly migrationRoot: string;

  constructor(config: ConfigService) {
    this.root = path.resolve(
      config.get<string>('CLIENT_IMAGE_DIR') ?? '../images/clients',
    );
    this.migrationRoot = path.resolve(
      config.get<string>('CLIENT_MIGRATION_IMAGE_DIR') ??
        '../migration/exports/client-photos',
    );
  }

  async save(base64: string) {
    if (
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        base64,
      )
    ) {
      throw new BadRequestException('Invalid base64 image');
    }
    const buffer = Buffer.from(base64, 'base64');
    const isPng = buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
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
          console.error('Could not clean up an incomplete client photo');
        });
      }
      throw error;
    }
    return `images/clients/${fileName}`;
  }

  async resolve(imagePath: string) {
    let base: string;
    let name: string;
    if (imagePath.startsWith('images/clients/')) {
      base = this.root;
      name = imagePath.slice('images/clients/'.length);
    } else if (imagePath.startsWith('migration/exports/client-photos/')) {
      base = this.migrationRoot;
      name = imagePath.slice('migration/exports/client-photos/'.length);
    } else {
      throw new BadRequestException('Invalid client image path');
    }
    if (!name || /[/\\\0]/.test(name) || name === '.' || name === '..') {
      throw new BadRequestException('Invalid client image path');
    }
    try {
      const [basePath, filePath] = await Promise.all([
        realpath(base),
        realpath(path.join(base, name)),
      ]);
      if (
        path.dirname(filePath) !== basePath ||
        !(await stat(filePath)).isFile()
      ) {
        throw new NotFoundException('Client image not found');
      }
      return filePath;
    } catch {
      throw new NotFoundException('Client image not found');
    }
  }

  async removeCreatedImage(imagePath: string) {
    if (!/^images\/clients\/[0-9a-f-]{36}\.(png|jpg)$/.test(imagePath)) {
      throw new BadRequestException('Invalid server-created image path');
    }
    await rm(path.join(this.root, path.basename(imagePath)), { force: true });
  }
}
