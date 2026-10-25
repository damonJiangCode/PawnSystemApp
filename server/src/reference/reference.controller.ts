import { Controller, Get } from '@nestjs/common';
import { ReferenceRepository } from './reference.repository.js';

@Controller('client/reference')
export class ReferenceController {
  constructor(private readonly repository: ReferenceRepository) {}

  @Get('cities')
  loadCities() {
    return this.repository.loadCities();
  }

  @Get('id-types')
  loadIdTypes() {
    return this.repository.loadIdTypes();
  }

  @Get('hair-colors')
  loadHairColors() {
    return this.repository.loadColors('hair');
  }

  @Get('eye-colors')
  loadEyeColors() {
    return this.repository.loadColors('eye');
  }
}
