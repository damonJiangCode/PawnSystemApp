import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsObject,
  IsString,
  MaxLength,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  CreateClientDetailsDto,
  CreateClientIdDto,
} from './create-client.dto.js';
import { SaveClientImageDto } from './save-client-image.dto.js';

// Reuse field validation while allowing omitted fields to remain unchanged.
export class UpdateClientDetailsDto extends PartialType(
  CreateClientDetailsDto,
  { skipNullProperties: false },
) {
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  is_active?: boolean;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @Matches(/^[1-9]\d{3}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  hold_until?: string | null;
}

export class UpdateClientDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateClientDetailsDto)
  client?: UpdateClientDetailsDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateClientIdDto)
  identifications?: CreateClientIdDto[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => SaveClientImageDto)
  photo?: SaveClientImageDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(200)
  employee_password?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['keep', 'clear', 'append_signature'])
  notes_action?: 'keep' | 'clear' | 'append_signature';
}
