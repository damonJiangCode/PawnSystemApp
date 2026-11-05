import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SaveImageDto } from '../common/save-image.dto.js';
import { TicketNumberParamsDto } from '../ticket/ticket.dto.js';

const MAX_INT = 2147483647;
// item.amount is NUMERIC(10,1).
const MAX_MONEY = 999_999_999.9;

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

export class SaveItemDto {
  @IsInt({ message: 'Quantity must be greater than 0.' })
  @Min(1, { message: 'Quantity must be greater than 0.' })
  @Max(MAX_INT, { message: 'Quantity is too large.' })
  quantity!: number;

  @IsInt({ message: 'Select a category.' })
  @Min(1, { message: 'Select a category.' })
  @Max(MAX_INT, { message: 'Select a category.' })
  subcategory_id!: number;

  @TrimUpper()
  @IsString()
  @IsNotEmpty({ message: 'Description is required.' })
  @MaxLength(500)
  description!: string;

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

  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 1 },
    { message: 'Enter a price with at most one decimal place.' },
  )
  @Min(0, { message: 'Price cannot be negative.' })
  @Max(MAX_MONEY, { message: 'Price is too large.' })
  amount!: number;
}

export class CreateItemDto extends SaveItemDto {
  @IsDefined({ message: 'Take an item photo.' })
  @ValidateNested()
  @Type(() => SaveImageDto)
  photo!: SaveImageDto;
}

// Without a photo the item keeps its current one.
export class UpdateItemDto extends SaveItemDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SaveImageDto)
  photo?: SaveImageDto;
}

export class LinkItemsDto {
  @IsArray({ message: 'Select at least one item.' })
  @ArrayMinSize(1, { message: 'Select at least one item.' })
  // Same limit as a search result page.
  @ArrayMaxSize(1000, { message: 'Select at most 1000 items.' })
  @IsInt({ each: true, message: 'Enter a valid item number.' })
  @Min(1, { each: true, message: 'Enter a valid item number.' })
  @Max(Number.MAX_SAFE_INTEGER, {
    each: true,
    message: 'Enter a valid item number.',
  })
  item_numbers!: number[];
}

export class TicketItemParamsDto extends TicketNumberParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  itemNumber!: number;
}
