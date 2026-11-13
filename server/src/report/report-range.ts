import { BadRequestException } from '@nestjs/common';
import type { ReportDateRangeQueryDto } from './report.dto.js';

const oneYearAfter = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year + 1, month - 1, day))
    .toISOString()
    .slice(0, 10);
};

// A report range must have To >= From and cover less than one year.
// YYYY-MM-DD strings compare correctly as text.
export const requireValidReportRange = ({
  from_date,
  to_date,
}: ReportDateRangeQueryDto) => {
  if (from_date > to_date) {
    throw new BadRequestException({
      field: 'to_date',
      message: 'To date must be the same as or later than From date.',
    });
  }
  if (to_date >= oneYearAfter(from_date)) {
    throw new BadRequestException({
      field: 'to_date',
      message: 'Date range cannot exceed 1 year.',
    });
  }
};
