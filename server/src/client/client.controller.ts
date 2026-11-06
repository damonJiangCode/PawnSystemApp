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
  ValidationPipe,
} from '@nestjs/common';
import { toImageResponse } from '../common/image-store.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { ClientService } from './client.service.js';
import { SearchClientDto } from './dto/search-client.dto.js';
import { SearchClientByDobDto } from './dto/search-client-by-dob.dto.js';

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

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

  @Get(':clientNumber/image')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async loadImage(@Param('clientNumber', ParseIntPipe) clientNumber: number) {
    return toImageResponse(
      await this.clientService.loadImageFile(clientNumber),
    );
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
}
