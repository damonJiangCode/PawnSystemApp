import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
const TrimUpper = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );

export const EMPLOYEE_GENDERS = ['male', 'female', 'unknown'] as const;

class EmployeeDetailsDto {
  @TrimUpper()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name!: string;

  @TrimUpper()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name!: string;

  @IsOptional()
  @TrimUpper()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @Trim()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date_of_birth must use YYYY-MM-DD.',
  })
  @IsISO8601(
    { strict: true },
    { message: 'date_of_birth must be a real date.' },
  )
  date_of_birth!: string;

  @IsIn(EMPLOYEE_GENDERS)
  gender!: (typeof EMPLOYEE_GENDERS)[number];

  @IsBoolean()
  is_terminated!: boolean;

  @IsBoolean()
  is_manager!: boolean;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  phone?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(254)
  email?: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Manager password is required.' })
  @MaxLength(20)
  manager_password!: string;
}

export class CreateEmployeeDto extends EmployeeDetailsDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MaxLength(20)
  password!: string;
}

export class UpdateEmployeeDto extends EmployeeDetailsDto {
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Password cannot be blank; omit it to keep it.' })
  @MaxLength(20)
  password?: string;
}

export class SearchEmployeeDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  last_name?: string;
}

export class EmployeeNumberParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  employeeNumber!: number;
}
