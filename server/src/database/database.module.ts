import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, types, type CustomTypesConfig } from 'pg';

// DATE columns (date_of_birth, hold_until, holiday_date) are calendar days with
// no time zone. By default pg turns them into a JS Date at midnight in the
// server's time zone, which can shift the day once it is serialized as UTC.
// This pool returns them exactly as stored, as YYYY-MM-DD strings; every other
// type, and every other pg client in the process, keeps pg's default parsing.
const PG_DATE_OID = 1082;
export const pgTypes = {
    getTypeParser: (oid: number, format?: 'text' | 'binary') =>
        oid === PG_DATE_OID
            ? (value: string) => value
            : types.getTypeParser(oid, format),
} as CustomTypesConfig;

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
                    types: pgTypes,
                });
            },
        },
    ],
    exports: [Pool],
})
export class DatabaseModule {}
