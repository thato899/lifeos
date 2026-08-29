import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 removed the Rust query engine; PrismaClient now talks to Postgres
// through an explicit driver adapter instead of reading DATABASE_URL itself.
// See docs/architecture.md ("Why Prisma 7's driver adapter") for the full
// rationale — this file is the one place the app touches that detail.
declare global {
  var __lifeosPrisma: PrismaClient | undefined;
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and configure it.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Reuse a single PrismaClient across hot reloads in dev; Next.js dev mode
// re-evaluates modules on every change, and a fresh client per reload would
// exhaust Postgres connections.
export const db = globalThis.__lifeosPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__lifeosPrisma = db;
}
