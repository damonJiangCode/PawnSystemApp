import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class LocationDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  location!: string;
}

export class CreateLocationDto extends LocationDto {
  @Matches(/^[a-zA-Z]{2}\d{2}$/, {
    message: 'Location code must contain two letters followed by two digits.',
  })
  declare location: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  description!: string;
}
