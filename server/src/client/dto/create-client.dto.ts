import { Transform, Type } from 'class-transformer';
import { SaveClientImageDto } from './save-client-image.dto.js';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  IsDefined,
  IsObject,
} from 'class-validator';

export class CreateClientDetailsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  first_name!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  last_name!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  gender!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  hair_color!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  eye_color!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  city!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  province!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  country!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  date_of_birth!: string;

  @IsNumber()
  @Min(0.1)
  @Max(9999.9)
  height_cm!: number;

  @IsNumber()
  @Min(0.1)
  @Max(9999.9)
  weight_kg!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  middle_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  postal_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  pickup_self_only?: boolean;
}

export class CreateClientIdDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  id_type!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  id_value!: string;
}

export class CreateClientDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => SaveClientImageDto)
  photo!: SaveClientImageDto;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateClientDetailsDto)
  client!: CreateClientDetailsDto;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateClientIdDto)
  identifications!: CreateClientIdDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  employee_password?: string;

  @IsOptional()
  @IsIn(['keep', 'clear', 'append_signature'])
  notes_action?: 'keep' | 'clear' | 'append_signature';
}
