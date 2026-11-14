import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Pool } from 'pg';

// A down database can make a query wait a long time; answer before Docker's
// health check gives up.
const DATABASE_TIMEOUT_MS = 3_000;

// GET /health for Docker and for checking the server from a shop computer:
// 200 when the server can reach PostgreSQL, 503 when it cannot.
@Controller('health')
export class HealthController {
  constructor(private readonly pool: Pool) {}

  @Get()
  async check() {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('timeout')),
        DATABASE_TIMEOUT_MS,
      );
    });
    try {
      await Promise.race([this.pool.query('SELECT 1'), timeout]);
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('The database is not reachable.');
    } finally {
      clearTimeout(timer);
    }
  }
}
