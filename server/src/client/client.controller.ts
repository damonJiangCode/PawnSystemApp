import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { ClientService } from './client.service.js';
import { SearchClientDto } from './dto/search-client.dto.js';

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
}