import { Pool, type PoolClient } from "pg";
import { loadEnv } from "../config/env.ts";

loadEnv();

if (!process.env.DB_PASSWORD) {
  throw new Error("Set DB_PASSWORD in private environment configuration.");
}

const pool = new Pool({
  user: process.env.DB_USER ?? "moneyexpress",
  host: process.env.DB_HOST ?? "localhost",
  database: process.env.DB_NAME ?? "pawnsystemdb",
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT ?? 5432),
});

export type DbClient = PoolClient;

export const connect = async (): Promise<DbClient> => {
  return pool.connect();
};
