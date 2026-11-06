import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
} from '@nestjs/common';
import { strictValidationPipe } from '../common/strict-validation.pipe.js';
import {
  CreateEmployeeDto,
  EmployeeNumberParamsDto,
  SearchEmployeeDto,
  UpdateEmployeeDto,
} from './employee.dto.js';
import { EmployeeService } from './employee.service.js';

@Controller('employees')
@UsePipes(strictValidationPipe)
export class EmployeeController {
  constructor(private readonly service: EmployeeService) {}

  @Get()
  search(@Query() query: SearchEmployeeDto) {
    return this.service.search(query);
  }

  @Post()
  create(@Body() input: CreateEmployeeDto) {
    return this.service.create(input);
  }

  @Put(':employeeNumber')
  update(
    @Param() params: EmployeeNumberParamsDto,
    @Body() input: UpdateEmployeeDto,
  ) {
    return this.service.update(params.employeeNumber, input);
  }
}
