import { Body, Controller, Get, Patch, Post, UsePipes } from '@nestjs/common';
import { strictValidationPipe } from '../../common/strict-validation.pipe.js';
import { ColorDto } from './color.dto.js';
import { ColorService } from './color.service.js';

@Controller('reference')
@UsePipes(strictValidationPipe)
export class ColorController {
  constructor(private readonly service: ColorService) {}

  @Get('hair-colors')
  loadHairColors() {
    return this.service.loadColors('hair');
  }

  @Get('eye-colors')
  loadEyeColors() {
    return this.service.loadColors('eye');
  }

  @Get('hair-colors/all')
  loadAllHairColors() {
    return this.service.loadAllColors('hair');
  }

  @Get('eye-colors/all')
  loadAllEyeColors() {
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
