import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
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

// Edit and convert share the editable ticket fields. Amount ≥ 0 here; the
// service requires > 0 when the (resulting) ticket is a sell.
class TicketDetailsDto {
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

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Enter employee password.' })
  @MaxLength(20)
  employee_password!: string;
}

export class UpdateTicketDto extends TicketDetailsDto {
  @IsBoolean()
  is_lost!: boolean;
}

export class ConvertTicketDto extends TicketDetailsDto {
  @IsIn(['pawned', 'sold'], { message: 'Choose pawned or sold.' })
  target_status!: 'pawned' | 'sold';
}

export class TransferTicketDto {
  @IsInt({ message: 'A client is required to transfer a ticket.' })
  @Min(1, { message: 'A client is required to transfer a ticket.' })
  @Max(2147483647)
  client_number!: number;
}

// Amounts are what the payment window showed; the server recomputes and
// rejects the batch if any differs.
class PickupLineDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  ticket_number!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  amount!: number;
}

export class PickupTicketsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one ticket.' })
  @ArrayMaxSize(100)
  @ArrayUnique((line: PickupLineDto) => line?.ticket_number, {
    message: 'Each ticket can be picked up only once.',
  })
  @ValidateNested({ each: true })
  @Type(() => PickupLineDto)
  tickets!: PickupLineDto[];
}

class ExtensionLineDto extends PickupLineDto {
  @IsInt()
  @Min(1)
  @Max(24)
  months!: number;
}

export class ExtendTicketsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one ticket.' })
  @ArrayMaxSize(100)
  @ArrayUnique((line: ExtensionLineDto) => line?.ticket_number, {
    message: 'Combine extensions of the same ticket into one line.',
  })
  @ValidateNested({ each: true })
  @Type(() => ExtensionLineDto)
  extensions!: ExtensionLineDto[];
}

export class SetStolenDto {
  @IsBoolean()
  is_stolen!: boolean;

  // Marking stolen is signed in the client's notes; unmarking needs no PIN.
  @ValidateIf((input: SetStolenDto) => input.is_stolen === true)
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Enter employee password.' })
  @MaxLength(20)
  employee_password?: string;
}

export class ReverseTicketDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Enter employee password.' })
  @MaxLength(20)
  employee_password!: string;
}
