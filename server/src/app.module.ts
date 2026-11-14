import { Module } from '@nestjs/common';
import { ClientModule } from './client/client.module.js';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { EmployeeModule } from './employee/employee.module.js';
import { HealthModule } from './health/health.module.js';
import { ItemModule } from './item/item.module.js';
import { ReferenceModule } from './reference/reference.module.js';
import { ReportModule } from './report/report.module.js';
import { TicketModule } from './ticket/ticket.module.js';
import { XmlReportModule } from './xml-report/xml-report.module.js';
import { fileURLToPath } from 'node:url';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        fileURLToPath(new URL('../.env', import.meta.url)),
        fileURLToPath(new URL('../../.env', import.meta.url)),
      ],
    }),
    ClientModule,
    EmployeeModule,
    HealthModule,
    ItemModule,
    ReferenceModule,
    ReportModule,
    TicketModule,
    XmlReportModule,
    DatabaseModule,
  ],
})
export class AppModule {}
