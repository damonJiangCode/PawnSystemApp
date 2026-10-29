import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// ticket.amount and ticket.onetime_fee are NUMERIC(10,1).
const MAX_MONEY = 999_999_999.9;
const ONE_DECIMAL = {
  allowNaN: false,
  allowInfinity: false,
  maxDecimalPlaces: 1,
};

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
const TrimUpper = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );

export class ListTicketsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  client_number!: number;
}

export class TicketNumberParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  ticketNumber!: number;
}

class CreateTicketDto {
  @IsInt({ message: 'Select a client before issuing a ticket.' })
  @Min(1, { message: 'Select a client before issuing a ticket.' })
  @Max(2147483647)
  client_number!: number;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Description is required.' })
  @MaxLength(2000)
  description!: string;

  @TrimUpper()
  @IsString()
  @IsNotEmpty({ message: 'Location is required.' })
  @MaxLength(100)
  location!: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Enter employee password.' })
  @MaxLength(20)
  employee_password!: string;
}

export class CreatePawnTicketDto extends CreateTicketDto {
  // 0 is allowed for signature-only pawn records (the dialog confirms it).
  @IsNumber(ONE_DECIMAL, {
    message: 'Amount must be a number with at most one decimal place.',
  })
  @Min(0, { message: 'Amount cannot be negative.' })
  @Max(MAX_MONEY)
  amount!: number;

  @IsNumber(ONE_DECIMAL, {
    message: 'One Time Fee must be a number with at most one decimal place.',
  })
  @Min(0, { message: 'One Time Fee cannot be negative.' })
  @Max(MAX_MONEY)
  onetime_fee!: number;
}

export class CreateSellTicketDto extends CreateTicketDto {
  @IsNumber(ONE_DECIMAL, {
    message: 'Amount must be a number with at most one decimal place.',
  })
  @Min(0.1, { message: 'Amount must be greater than 0.' })
  @Max(MAX_MONEY)
  amount!: number;
}
