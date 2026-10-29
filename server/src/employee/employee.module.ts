import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { EmployeePinHasher } from './employee-pin.hasher.js';
import { EmployeeController } from './employee.controller.js';
import { EmployeeRepository } from './employee.repository.js';
import { EmployeeService } from './employee.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [EmployeeController],
  providers: [EmployeeService, EmployeeRepository, EmployeePinHasher],
  exports: [EmployeeRepository],
})
export class EmployeeModule {}
