import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { ClientService } from './client.service.js';
import { SearchClientDto } from './dto/search-client.dto.js';
import { SearchClientByDobDto } from './dto/search-client-by-dob.dto.js';

@Controller('client')
export class ClientController {
    constructor(private readonly clientService: ClientService) {}
  @Get()
  search(
    @Query(new ValidationPipe({ 
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    })) 
    query: SearchClientDto
  ) {
    return this.clientService.search(query.firstName, query.lastName);
  }

  @Get('by-dob')
  searchByDob(
    @Query(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }))
    query: SearchClientByDobDto,
  ) {
    return this.clientService.searchByDob(query.dateOfBirth);
  }

  @Get('db-check')
  checkDatabaseConnection() {
    return this.clientService.checkDatabaseConnection();
  }
}
