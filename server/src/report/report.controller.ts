import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import { fieldValidationPipe } from '../common/field-validation.pipe.js';
import { ReportDateRangeQueryDto } from './report.dto.js';
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
}
