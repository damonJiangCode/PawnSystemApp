import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ClientModule } from './client/client.module.js';

@Module({
  imports: [ClientModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
