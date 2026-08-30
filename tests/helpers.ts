import { db } from "@/lib/db";

/**
 * These are integration tests: they run against the real docker-compose
 * Postgres instance (see docker-compose.yml / DATABASE_URL), not a mock.
 * Each test creates and tears down its own ephemeral user so tests can run
 * concurrently without colliding, and never touch the seeded demo account.
 */
export async function createTestUser(namePrefix = "test") {
  return db.user.create({
    data: {
      name: `${namePrefix} user`,
      email: `${namePrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@lifeos.test`,
      passwordHash: "not-a-real-hash",
    },
  });
}

export async function deleteTestUser(userId: string) {
  await db.user.delete({ where: { id: userId } }).catch(() => {
    // already deleted by the test, or cascaded away — fine either way
  });
}
