// Minimal placeholder seed so `npm run db:seed` works from Phase 1 onward.
// The full realistic demo dataset (Alex's messy week — see docs/demo.md)
// is built out in Phase 2/6 alongside the modules that display it.
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

async function main() {
  const passwordHash = await bcrypt.hash("lifeos-demo", 10);

  const demoUser = await db.user.upsert({
    where: { email: "alex@demo.lifeos.app" },
    update: {},
    create: {
      name: "Alex",
      email: "alex@demo.lifeos.app",
      passwordHash,
      isDemo: true,
      noScheduleAfter: "19:00",
    },
  });

  console.log(`Seeded demo user: ${demoUser.email} (id: ${demoUser.id})`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
