// Phase 1: three hardcoded internal users.
// Passwords are stored as bcrypt hashes in environment variables.
// Run `npx tsx scripts/hash-password.ts <password>` to generate a hash.

export type InternalUser = {
  id: string;
  username: string;
  fullName: string;
  role: string;
  passwordHash: string;
};

export function getInternalUsers(): InternalUser[] {
  const users: InternalUser[] = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      username: "anthony",
      fullName: "Anthony (IT)",
      role: "IT Coordinator",
      passwordHash: process.env.AUTH_ANTHONY_PASSWORD_HASH || "",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      username: "dee",
      fullName: "Dee (Operations)",
      role: "Operations Manager",
      passwordHash: process.env.AUTH_DEE_PASSWORD_HASH || "",
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      username: "james",
      fullName: "James (Director)",
      role: "Director of Operations",
      passwordHash: process.env.AUTH_JAMES_PASSWORD_HASH || "",
    },
  ];

  const missing = users.filter((u) => !u.passwordHash).map((u) => u.username);
  if (missing.length > 0) {
    throw new Error(
      `Missing password hash env vars for: ${missing.join(", ")}. ` +
      `Set AUTH_ANTHONY_PASSWORD_HASH, AUTH_DEE_PASSWORD_HASH, AUTH_JAMES_PASSWORD_HASH in .env`
    );
  }

  return users;
}

export function findUserByUsername(username: string): InternalUser | undefined {
  return getInternalUsers().find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
}
