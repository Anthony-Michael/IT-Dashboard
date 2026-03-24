import { pool, testDbConnection } from "../src/db";

async function main(): Promise<void> {
  try {
    await testDbConnection();
    console.log("Database connection successful.");
    process.exit(0);
  } catch (error) {
    console.error("Database connection failed.");
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

