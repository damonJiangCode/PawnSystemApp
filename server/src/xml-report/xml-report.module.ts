import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { LeadsOnlineClient } from './leadsonline.client.js';
import { LeadsOnlineConfig } from './leadsonline.config.js';
import { XmlReportController } from './xml-report.controller.js';
import { XmlReportRepository } from './xml-report.repository.js';
import { XmlReportService } from './xml-report.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [XmlReportController],
  providers: [
    XmlReportService,
    XmlReportRepository,
    LeadsOnlineConfig,
    LeadsOnlineClient,
  ],
})
export class XmlReportModule {}
