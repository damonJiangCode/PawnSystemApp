import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MAX_INT = 2147483647;

const TrimUpper = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );

// Query values arrive as strings; @Type converts the numeric ones first.
export class SearchItemsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Select a valid client.' })
  @Min(1, { message: 'Select a valid client.' })
  @Max(MAX_INT, { message: 'Select a valid client.' })
  client_number?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Enter a valid item number.' })
  @Min(1, { message: 'Enter a valid item number.' })
  @Max(Number.MAX_SAFE_INTEGER, { message: 'Enter a valid item number.' })
  item_number?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT)
  category_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT)
  subcategory_id?: number;

  @IsOptional()
  @TrimUpper()
  @IsString()
  @MaxLength(100)
  brand_name?: string;

  @IsOptional()
  @TrimUpper()
  @IsString()
  @MaxLength(100)
  model_number?: string;

  @IsOptional()
  @TrimUpper()
  @IsString()
  @MaxLength(100)
  serial_number?: string;
}
