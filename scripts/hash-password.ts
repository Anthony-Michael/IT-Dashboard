/**
 * Usage: npx tsx scripts/hash-password.ts <password>
 * Outputs a bcrypt hash to paste into .env for AUTH_*_PASSWORD_HASH variables.
 */
import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error("Usage: npx tsx scripts/hash-password.ts <password>");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log(hash);
