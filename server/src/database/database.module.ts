import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, types } from 'pg';

// DATE columns (date_of_birth, hold_until, holiday_date) are calendar days with
// no time zone. By default pg turns them into a JS Date at midnight in the
// server's time zone, which can shift the day once it is serialized as UTC.
// Return them exactly as stored, as YYYY-MM-DD strings.
const PG_DATE_OID = 1082;
types.setTypeParser(PG_DATE_OID, (value) => value);

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
