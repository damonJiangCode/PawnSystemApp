import { Body, Controller, Get, Patch, Post, UsePipes } from '@nestjs/common';
import { strictValidationPipe } from '../../common/strict-validation.pipe.js';
import { CreateLocationDto, LocationDto } from './location.dto.js';
import { LocationService } from './location.service.js';

@Controller('reference/locations')
@UsePipes(strictValidationPipe)
export class LocationController {
  constructor(private readonly service: LocationService) {}

  @Get()
  loadLocations() {
    return this.service.loadLocations();
  }

  @Get('all')
  loadAllLocations() {
    return this.service.loadAllLocations();
  }

  @Post()
  addLocation(@Body() input: CreateLocationDto) {
    return this.service.addLocation(input.location, input.description);
  }

  @Patch('deactivate')
  deactivateLocation(@Body() input: LocationDto) {
    return this.service.setLocationActive(input.location, false);
  }

  @Patch('activate')
  activateLocation(@Body() input: LocationDto) {
    return this.service.setLocationActive(input.location, true);
  }
}
