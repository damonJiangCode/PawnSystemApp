import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

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
