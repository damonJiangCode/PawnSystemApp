import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsDateString, IsString, Matches } from 'class-validator';

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
