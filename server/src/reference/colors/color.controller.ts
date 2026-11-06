import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UsePipes,
} from '@nestjs/common';
import { strictValidationPipe } from '../../common/strict-validation.pipe.js';
import { ColorDto, ColorKindParamsDto } from './color.dto.js';
import { ColorService } from './color.service.js';

@Controller('reference/colors/:kind')
@UsePipes(strictValidationPipe)
export class ColorController {
  constructor(private readonly service: ColorService) {}

  @Get()
  loadColors(@Param() params: ColorKindParamsDto) {
    return this.service.loadColors(params.kind);
  }

  @Get('all')
  loadAllColors(@Param() params: ColorKindParamsDto) {
    return this.service.loadAllColors(params.kind);
  }

  @Post()
  async addColor(@Param() params: ColorKindParamsDto, @Body() input: ColorDto) {
    return { color: await this.service.addColor(params.kind, input.color) };
  }

  @Patch('activate')
  activateColor(@Param() params: ColorKindParamsDto, @Body() input: ColorDto) {
    return this.service.setColorActive(params.kind, input.color, true);
  }

  @Patch('deactivate')
  deactivateColor(
    @Param() params: ColorKindParamsDto,
    @Body() input: ColorDto,
  ) {
    return this.service.setColorActive(params.kind, input.color, false);
  }
}
