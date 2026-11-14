import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { fieldValidationPipe } from '../common/field-validation.pipe.js';
import { ReportDateRangeQueryDto } from '../report/report.dto.js';
import { XmlReportService } from './xml-report.service.js';

@Controller('xml-reports')
@UsePipes(fieldValidationPipe)
export class XmlReportController {
  constructor(private readonly service: XmlReportService) {}

  @Get('connection')
  checkConnection() {
    return this.service.checkConnection();
  }

  @Get('preview')
  loadPreview(@Query() range: ReportDateRangeQueryDto) {
    return this.service.loadPreview(range);
  }

  // 200, not 201: it sends tickets and returns results; nothing is created here.
  @Post('submit')
  @HttpCode(200)
  submit(@Body() range: ReportDateRangeQueryDto) {
    return this.service.submit(range);
  }
}
