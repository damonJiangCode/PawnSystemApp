import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateHolidayDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/, {
    message: 'holiday_date must use YYYY-MM-DD',
  })
  @IsDateString(
    { strict: true },
    { message: 'holiday_date must be a valid calendar date' },
  )
  holiday_date!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class HolidayDateParamsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/, {
    message: 'holidayDate must use YYYY-MM-DD',
  })
  @IsDateString(
    { strict: true },
    { message: 'holidayDate must be a valid calendar date' },
  )
  holidayDate!: string;
}
