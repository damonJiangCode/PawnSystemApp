import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateItemCategoryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  category_name!: string;
}

export class CreateItemSubcategoryDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  category_id!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  subcategory_name!: string;
}

export class CategoryIdParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  categoryId!: number;
}

export class SubcategoryIdParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  subcategoryId!: number;
}

export class ItemCategoryStateDto {
  @IsBoolean()
  is_active!: boolean;
}
