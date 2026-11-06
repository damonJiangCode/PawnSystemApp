import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('hello')
  getHello(@Query('name') name?: string): string {
    if (name !== undefined &&
        (typeof name !== 'string' || name.trim() === '')) {
      throw new BadRequestException('name must be a non-empty string if provided  ');
    }

    return this.appService.getHello(name?.trim() ?? 'guest');
  }
}
