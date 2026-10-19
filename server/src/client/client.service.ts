import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { ClientRepository } from './client.repository.js';

@Injectable()
export class ClientService {
    constructor(
        private readonly pool: Pool,
        private readonly clientRepository: ClientRepository,
    ) {}

    async checkDatabaseConnection() {
        const result = await this.pool.query('SELECT 1 AS value');
        return result.rows[0];
    }
    async search(firstName?: string, lastName?: string) {
        const first = firstName?.trim() ?? '';
        const last = lastName?.trim() ?? '';
        if (!first && !last) {
            return [];
        }

        return this.clientRepository.searchByName(first, last);
    }
}
