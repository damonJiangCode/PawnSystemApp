import { Injectable } from '@nestjs/common';
import { CityRepository } from './city.repository.js';

@Injectable()
export class CityService {
  constructor(private readonly repository: CityRepository) {}

  loadCities() {
    return this.repository.loadCities();
  }
}
