import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { ColorKind } from './color.repository.js';

export class ColorKindParamsDto {
  @IsIn(['hair', 'eye'])
  kind!: ColorKind;
}

export class ColorDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  color!: string;
}
