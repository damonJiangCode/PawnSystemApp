import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ReferenceService } from './reference.service.js';
import { ColorDto } from './dto/color.dto.js';

@Controller('client/reference')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ReferenceController {
  constructor(private readonly service: ReferenceService) {}

  @Get('cities')
  loadCities() {
    return this.service.loadCities();
  }

  @Get('id-types')
  loadIdTypes() {
    return this.service.loadIdTypes();
  }

  @Get('hair-colors')
  loadHairColors() {
    return this.service.loadColors('hair');
  }

  @Get('eye-colors')
  loadEyeColors() {
    return this.service.loadColors('eye');
  }

  @Get('hair-colors/all')
  loadHairColorsForAdmin() {
    return this.service.loadAllColors('hair');
  }

  @Get('eye-colors/all')
  loadEyeColorsForAdmin() {
    return this.service.loadAllColors('eye');
  }

  @Post('hair-colors')
  async addHairColor(@Body() input: ColorDto) {
    return { color: await this.service.addColor('hair', input.color) };
  }

  @Post('eye-colors')
  async addEyeColor(@Body() input: ColorDto) {
    return { color: await this.service.addColor('eye', input.color) };
  }

  @Patch('hair-colors/activate')
  activateHairColor(@Body() input: ColorDto) {
    return this.service.setColorActive('hair', input.color, true);
  }

  @Patch('hair-colors/deactivate')
  deactivateHairColor(@Body() input: ColorDto) {
    return this.service.setColorActive('hair', input.color, false);
  }

  @Patch('eye-colors/activate')
  activateEyeColor(@Body() input: ColorDto) {
    return this.service.setColorActive('eye', input.color, true);
  }

  @Patch('eye-colors/deactivate')
  deactivateEyeColor(@Body() input: ColorDto) {
    return this.service.setColorActive('eye', input.color, false);
  }
}
