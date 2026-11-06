import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemCategoryRepository } from './item-category.repository.js';

@Injectable()
export class ItemCategoryService {
  constructor(private readonly repository: ItemCategoryRepository) {}

  loadItemCategories() {
    return this.repository.loadItemCategories();
  }

  loadAllItemCategories() {
    return this.repository.loadAllItemCategories();
  }

  async addItemCategory(name: string) {
    const saved = await this.repository.addItemCategory(name);
    if (!saved) throw new ConflictException('That category already exists.');
    return saved;
  }

  async addItemSubcategory(categoryId: number, name: string) {
    const result = await this.repository.addItemSubcategory(categoryId, name);
    if ('value' in result) return result.value;
    switch (result.error) {
      case 'category-not-found':
        throw new NotFoundException('That category was not found.');
      case 'category-inactive':
        throw new ConflictException(
          'Activate that category before adding a subcategory.',
        );
      case 'subcategory-exists':
        throw new ConflictException(
          'That subcategory already exists in this category.',
        );
      default: {
        // Fails to compile if a new repository error is not handled above.
        const unhandled: never = result.error;
        throw new Error(`Unhandled subcategory error: ${String(unhandled)}`);
      }
    }
  }

  async setItemCategoryActive(id: number, isActive: boolean) {
    const saved = await this.repository.setItemCategoryActive(id, isActive);
    if (!saved) throw new NotFoundException('That category was not found.');
    return saved;
  }

  async setItemSubcategoryActive(id: number, isActive: boolean) {
    const saved = await this.repository.setItemSubcategoryActive(id, isActive);
    if (!saved) throw new NotFoundException('That subcategory was not found.');
    return saved;
  }
}
