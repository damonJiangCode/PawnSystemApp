import { Module } from '@nestjs/common';
import { EmployeeRepository } from './employee.repository.js';

@Module({
  providers: [EmployeeRepository],
  exports: [EmployeeRepository],
})
export class EmployeeModule {}
