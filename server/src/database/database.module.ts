import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Module({
    providers: [
        {
            provide: Pool,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                return new Pool({
                    host: configService.get<string>('DB_HOST'),
                    port: configService.get<number>('DB_PORT'),
                    database: configService.get<string>('DB_NAME'),
                    user: configService.get<string>('DB_USER'),
                    password: configService.get<string>('DB_PASSWORD'),
                });
            },
        },
    ],
    exports: [Pool],
})
export class DatabaseModule {}
