import { Body, Controller, Get, Patch, Post, UsePipes } from '@nestjs/common';
import { strictValidationPipe } from '../../common/strict-validation.pipe.js';
import { IdTypeDto } from './id-type.dto.js';
import { IdTypeService } from './id-type.service.js';

@Controller('reference/id-types')
@UsePipes(strictValidationPipe)
export class IdTypeController {
  constructor(private readonly service: IdTypeService) {}

  @Get()
  loadIdTypes() {
    return this.service.loadIdTypes();
  }

  @Get('all')
  loadAllIdTypes() {
    return this.service.loadAllIdTypes();
  }

  @Post()
  addIdType(@Body() input: IdTypeDto) {
    return this.service.addIdType(input.type);
  }

  @Patch('activate')
  activateIdType(@Body() input: IdTypeDto) {
    return this.service.setIdTypeActive(input.type, true);
  }

  @Patch('deactivate')
  deactivateIdType(@Body() input: IdTypeDto) {
    return this.service.setIdTypeActive(input.type, false);
  }
}
