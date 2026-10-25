import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ClientModule } from './client/client.module.js';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { ReferenceModule } from './reference/reference.module.js';
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
    ReferenceModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
