import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SaveClientImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(7000000)
  base64!: string;
}
