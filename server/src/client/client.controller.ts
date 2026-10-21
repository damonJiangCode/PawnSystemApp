import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  StreamableFile,
  ValidationPipe,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { ClientImageService } from './client-image.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ClientService } from './client.service.js';
import { SearchClientDto } from './dto/search-client.dto.js';
import { SearchClientByDobDto } from './dto/search-client-by-dob.dto.js';

class ClientImageQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  path!: string;
}

@Controller('client')
export class ClientController {
  constructor(
    private readonly clientService: ClientService,
    private readonly images: ClientImageService,
  ) {}

  @Post()
  create(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    input: CreateClientDto,
  ) {
    return this.clientService.create(input);
  }

  @Patch(':clientNumber')
  update(
    @Param('clientNumber', ParseIntPipe) clientNumber: number,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    input: UpdateClientDto,
  ) {
    return this.clientService.update(clientNumber, input);
  }

  @Get('images')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async loadImage(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ClientImageQueryDto,
  ) {
    const file = await this.images.resolve(query.path);
    return new StreamableFile(createReadStream(file), {
      type: /\.png$/i.test(file) ? 'image/png' : 'image/jpeg',
    });
  }
  @Get()
  search(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: SearchClientDto,
  ) {
    return this.clientService.search(query.firstName, query.lastName);
  }

  @Get('by-dob')
  searchByDob(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: SearchClientByDobDto,
  ) {
    return this.clientService.searchByDob(query.dateOfBirth);
  }

  @Get('db-check')
  checkDatabaseConnection() {
    return this.clientService.checkDatabaseConnection();
  }
}
