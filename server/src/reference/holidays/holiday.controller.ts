import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UsePipes,
} from '@nestjs/common';
import { strictValidationPipe } from '../../common/strict-validation.pipe.js';
import { CreateHolidayDto, HolidayDateParamsDto } from './holiday.dto.js';
import { HolidayService } from './holiday.service.js';

@Controller('reference/holidays')
@UsePipes(strictValidationPipe)
export class HolidayController {
  constructor(private readonly service: HolidayService) {}

  @Get()
  loadHolidayDates() {
    return this.service.loadHolidayDates();
  }

  @Post()
  addHolidayDate(@Body() input: CreateHolidayDto) {
    return this.service.addHolidayDate(input.holiday_date, input.name);
  }

  @Delete(':holidayDate')
  deleteHolidayDate(@Param() params: HolidayDateParamsDto) {
    return this.service.deleteHolidayDate(params.holidayDate);
  }
}
