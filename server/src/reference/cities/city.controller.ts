import { Controller, Get } from '@nestjs/common';
import { CityService } from './city.service.js';

@Controller('reference/cities')
export class CityController {
  constructor(private readonly service: CityService) {}

  @Get()
  loadCities() {
    return this.service.loadCities();
  }
}
