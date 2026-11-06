import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { CityController } from './cities/city.controller.js';
import { CityRepository } from './cities/city.repository.js';
import { CityService } from './cities/city.service.js';
import { ColorController } from './colors/color.controller.js';
import { ColorRepository } from './colors/color.repository.js';
import { ColorService } from './colors/color.service.js';
import { HolidayController } from './holidays/holiday.controller.js';
import { HolidayRepository } from './holidays/holiday.repository.js';
import { HolidayService } from './holidays/holiday.service.js';
import { IdTypeController } from './id-types/id-type.controller.js';
import { IdTypeRepository } from './id-types/id-type.repository.js';
import { IdTypeService } from './id-types/id-type.service.js';
import { ItemCategoryController } from './item-categories/item-category.controller.js';
import { ItemCategoryRepository } from './item-categories/item-category.repository.js';
import { ItemCategoryService } from './item-categories/item-category.service.js';
import { LocationController } from './locations/location.controller.js';
import { LocationRepository } from './locations/location.repository.js';
import { LocationService } from './locations/location.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [
    CityController,
    IdTypeController,
    ColorController,
    LocationController,
    HolidayController,
    ItemCategoryController,
  ],
  providers: [
    CityRepository,
    CityService,
    IdTypeRepository,
    IdTypeService,
    ColorRepository,
    ColorService,
    LocationRepository,
    LocationService,
    HolidayRepository,
    HolidayService,
    ItemCategoryRepository,
    ItemCategoryService,
  ],
  exports: [HolidayRepository],
})
export class ReferenceModule {}
