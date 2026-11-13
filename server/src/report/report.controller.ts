import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import { fieldValidationPipe } from '../common/field-validation.pipe.js';
import {
  OverdueReportQueryDto,
  ReportDateRangeQueryDto,
} from './report.dto.js';
import { ReportService } from './report.service.js';

@Controller('reports')
@UsePipes(fieldValidationPipe)
export class ReportController {
  constructor(private readonly service: ReportService) {}

  @Get('daily')
  loadDaily(@Query() range: ReportDateRangeQueryDto) {
    return this.service.loadDaily(range);
  }

  @Get('buyback')
  loadBuyback(@Query() range: ReportDateRangeQueryDto) {
    return this.service.loadBuyback(range);
  }

  @Get('interest')
  loadInterest(@Query() range: ReportDateRangeQueryDto) {
    return this.service.loadInterest(range);
  }

  @Get('overdue')
  loadOverdue(@Query() query: OverdueReportQueryDto) {
    return this.service.loadOverdue(query);
  }
}
