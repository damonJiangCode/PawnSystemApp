import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageStore } from '../common/image-store.js';

@Injectable()
export class ItemImageService {
  private readonly store: ImageStore;

  constructor(config: ConfigService) {
    this.store = new ImageStore({
      root: config.get<string>('ITEM_IMAGE_DIR') ?? '../images/items',
      prefix: 'images/items/',
      migrationRoot:
        config.get<string>('ITEM_MIGRATION_IMAGE_DIR') ??
        '../database/migration/exports/item-photos',
      migrationPrefixes: [
        'database/migration/exports/item-photos/',
        'migration/exports/item-photos/',
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
