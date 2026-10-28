import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UsePipes,
} from '@nestjs/common';
import { strictValidationPipe } from '../../common/strict-validation.pipe.js';
import {
  CategoryIdParamsDto,
  CreateItemCategoryDto,
  CreateItemSubcategoryDto,
  ItemCategoryStateDto,
  SubcategoryIdParamsDto,
} from './item-category.dto.js';
import { ItemCategoryService } from './item-category.service.js';

@Controller('reference')
@UsePipes(strictValidationPipe)
export class ItemCategoryController {
  constructor(private readonly service: ItemCategoryService) {}

  @Get('item-categories')
  loadItemCategories() {
    return this.service.loadItemCategories();
  }

  @Get('item-categories/all')
  loadAllItemCategories() {
    return this.service.loadAllItemCategories();
  }

  @Post('item-categories')
  addItemCategory(@Body() input: CreateItemCategoryDto) {
    return this.service.addItemCategory(input.category_name);
  }

  @Post('item-subcategories')
  addItemSubcategory(@Body() input: CreateItemSubcategoryDto) {
    return this.service.addItemSubcategory(
      input.category_id,
      input.subcategory_name,
    );
  }

  @Patch('item-categories/:categoryId')
  setItemCategoryActive(
    @Param() params: CategoryIdParamsDto,
    @Body() input: ItemCategoryStateDto,
  ) {
    return this.service.setItemCategoryActive(
      params.categoryId,
      input.is_active,
    );
  }

  @Patch('item-subcategories/:subcategoryId')
  setItemSubcategoryActive(
    @Param() params: SubcategoryIdParamsDto,
    @Body() input: ItemCategoryStateDto,
  ) {
    return this.service.setItemSubcategoryActive(
      params.subcategoryId,
      input.is_active,
    );
  }
}
