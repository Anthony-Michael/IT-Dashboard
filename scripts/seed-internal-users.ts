import { pool } from "../src/db";

const INTERNAL_USERS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    full_name: "Anthony",
    email: "anthony@example.com",
    role: "it_coordinator"
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    full_name: "Dee",
    email: "dee@example.com",
    role: "operations_manager"
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    full_name: "James",
    email: "james@example.com",
    role: "director_of_operations"
  }
];

async function main(): Promise<void> {
  try {
    for (const user of INTERNAL_USERS) {
      await pool.query(
        `INSERT INTO users (id, full_name, email, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id)
         DO UPDATE SET
           full_name = EXCLUDED.full_name,
           email = EXCLUDED.email,
           role = EXCLUDED.role,
           updated_at = NOW()`,
        [user.id, user.full_name, user.email, user.role]
      );
    }

    console.log(`Seeded ${INTERNAL_USERS.length} internal users.`);
  } catch (error) {
    console.error("Failed to seed internal users.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
