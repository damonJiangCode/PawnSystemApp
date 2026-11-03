import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageStore } from '../common/image-store.js';

@Injectable()
export class ClientImageService {
  private readonly store: ImageStore;

  constructor(config: ConfigService) {
    this.store = new ImageStore({
      root: config.get<string>('CLIENT_IMAGE_DIR') ?? '../images/clients',
      prefix: 'images/clients/',
      migrationRoot:
        config.get<string>('CLIENT_MIGRATION_IMAGE_DIR') ??
        '../database/migration/exports/client-photos',
      migrationPrefixes: [
        'database/migration/exports/client-photos/',
        'migration/exports/client-photos/',
      ],
    });
  }

  save(base64: string) {
    return this.store.save(base64);
  }

  resolve(imagePath: string) {
    return this.store.resolve(imagePath);
  }

  removeCreatedImage(imagePath: string) {
    return this.store.removeCreated(imagePath);
  }
}
