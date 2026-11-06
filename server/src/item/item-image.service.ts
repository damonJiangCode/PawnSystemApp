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
