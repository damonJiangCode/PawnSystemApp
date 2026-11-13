import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsString, Matches } from 'class-validator';

// YYYY-MM-DD
const ReportDate = (message: string) =>
  applyDecorators(
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
    IsString({ message }),
    Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/, { message }),
    IsDateString({ strict: true }, { message }),
  );

export class ReportDateRangeQueryDto {
  @ReportDate('Enter a valid From date.')
  from_date!: string;

  @ReportDate('Enter a valid To date.')
  to_date!: string;
}

// Any location code; the service checks that it exists. Codes are uppercase.
const ReportLocation = (message: string) =>
  applyDecorators(
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim().toUpperCase() : value,
    ),
    IsString({ message }),
    IsNotEmpty({ message }),
  );

export class OverdueReportQueryDto {
  @ReportDate('Enter a valid Due On or Before date.')
  due_on_or_before!: string;

  @ReportLocation('Select a From location.')
  location_from!: string;

  @ReportLocation('Select a To location.')
  location_to!: string;
}
