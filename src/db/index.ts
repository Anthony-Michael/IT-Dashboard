import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const dbPort = Number(process.env.DB_PORT || 5432);

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: dbPort,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "postgres"
});

export async function testDbConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

