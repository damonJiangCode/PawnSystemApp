import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchClientDto {
    @IsOptional()
    @IsString()
    @MaxLength(20)
    firstName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    lastName?: string;
}