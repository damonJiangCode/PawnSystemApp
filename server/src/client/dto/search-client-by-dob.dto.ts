import { Transform } from 'class-transformer';
import { IsDateString, IsString, Matches } from 'class-validator';

export class SearchClientByDobDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must use YYYY-MM-DD' })
  @IsDateString({ strict: true }, { message: 'dateOfBirth must be a valid calendar date' })
  dateOfBirth!: string;
}
