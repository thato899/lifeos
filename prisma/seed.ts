// Realistic demo dataset — "Alex's messy week" (spec sections 29/30). Every
// date is computed relative to when this runs, so the demo always looks
// fresh (an overdue task is overdue relative to today, not a fixed date
// that ages into irrelevance). Re-running this script is safe: it deletes
// and rebuilds just the demo user's data (upsert on email), never touches
// other accounts.
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

const DEMO_EMAIL = "alex@demo.lifeos.app";
const DEMO_PASSWORD = "lifeos-demo";

function daysFromNow(n: number, hour = 9, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function monthsAgo(n: number, dayOfMonth: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n, dayOfMonth);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: "Alex",
      isDemo: true,
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      noScheduleAfter: "19:00",
    },
    create: {
      name: "Alex",
      email: DEMO_EMAIL,
      passwordHash,
      isDemo: true,
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      noScheduleAfter: "19:00",
    },
  });

  // Wipe this user's data so the script is safely re-runnable.
  await db.$transaction([
    db.approvalRequest.deleteMany({ where: { userId: user.id } }),
    db.activityEvent.deleteMany({ where: { userId: user.id } }),
    db.scheduleBlock.deleteMany({ where: { userId: user.id } }),
    db.taskTag.deleteMany({ where: { task: { userId: user.id } } }),
    db.task.deleteMany({ where: { userId: user.id } }),
    db.goalMilestone.deleteMany({ where: { goal: { userId: user.id } } }),
    db.goal.deleteMany({ where: { userId: user.id } }),
    db.shoppingItem.deleteMany({ where: { list: { userId: user.id } } }),
    db.shoppingList.deleteMany({ where: { userId: user.id } }),
    db.expense.deleteMany({ where: { userId: user.id } }),
    db.budget.deleteMany({ where: { userId: user.id } }),
    db.routineStep.deleteMany({ where: { routine: { userId: user.id } } }),
    db.routine.deleteMany({ where: { userId: user.id } }),
  ]);

  // --- Goals -----------------------------------------------------------
  const certGoal = await db.goal.create({
    data: {
      userId: user.id,
      title: "Complete certification",
      description: "Finish the professional certification course.",
      category: "education",
      status: "active",
      progress: 40,
      targetDate: daysFromNow(60),
      milestones: {
        create: [
          {
            title: "Finish core modules",
            order: 0,
            completed: true,
            completedAt: daysFromNow(-20),
          },
          {
            title: "Pass practice exam",
            order: 1,
            completed: false,
            targetDate: daysFromNow(30),
          },
          {
            title: "Sit the final exam",
            order: 2,
            completed: false,
            targetDate: daysFromNow(55),
          },
        ],
      },
    },
  });

  await db.goal.create({
    data: {
      userId: user.id,
      title: "Save R20,000",
      description: "Build an emergency fund.",
      category: "finance",
      status: "active",
      progress: 25,
      targetDate: daysFromNow(120),
    },
  });

  const websiteGoal = await db.goal.create({
    data: {
      userId: user.id,
      title: "Launch my website",
      description: "Ship the personal portfolio / side project site.",
      category: "project",
      status: "active",
      progress: 15,
      targetDate: daysFromNow(21),
    },
  });

  // --- Tasks -------------------------------------------------------------
  await db.task.create({
    data: {
      userId: user.id,
      title: "Submit project report",
      description: "Final report for the Q3 project review.",
      priority: "urgent",
      status: "planned",
      dueDate: daysFromNow(-2, 17, 0), // overdue
      estimatedMinutes: 90,
      category: "work",
    },
  });

  await db.task.create({
    data: {
      userId: user.id,
      title: "Buy groceries",
      priority: "medium",
      status: "planned",
      dueDate: daysFromNow(3, 18, 0),
      estimatedMinutes: 45,
      category: "errands",
    },
  });

  await db.task.create({
    data: {
      userId: user.id,
      title: "Pay electricity",
      priority: "high",
      status: "planned",
      dueDate: daysFromNow(3, 12, 0),
      estimatedMinutes: 15,
      category: "housing",
    },
  });

  await db.task.create({
    data: {
      userId: user.id,
      title: "Study SQL",
      description: "Chapter 4 exercises for the certification course.",
      priority: "medium",
      status: "planned",
      dueDate: daysFromNow(5, 20, 0),
      estimatedMinutes: 90,
      category: "education",
      goalId: certGoal.id,
    },
  });

  await db.task.create({
    data: {
      userId: user.id,
      title: "Exercise",
      priority: "medium",
      status: "planned",
      dueDate: daysFromNow(1, 18, 0),
      estimatedMinutes: 45,
      category: "health",
      recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [1, 3, 5] },
    },
  });

  await db.task.create({
    data: {
      userId: user.id,
      title: "Design homepage",
      priority: "high",
      status: "inbox",
      dueDate: daysFromNow(10, 17, 0),
      estimatedMinutes: 120,
      category: "project",
      goalId: websiteGoal.id,
    },
  });

  await db.task.create({
    data: {
      userId: user.id,
      title: "Finish website",
      priority: "high",
      status: "inbox",
      dueDate: daysFromNow(20, 17, 0),
      estimatedMinutes: 180,
      category: "project",
      goalId: websiteGoal.id,
    },
  });

  // --- Schedule: a genuinely messy upcoming week ---------------------------
  // Anchored to "today" (daysFromNow), not a Monday-anchored calendar week —
  // that way every seeded block is always genuinely upcoming and lands in
  // the Calendar page's rolling 7-day view, no matter which day of the week
  // this is run on. See src/app/app/calendar/page.tsx for the matching
  // rolling-window default.
  await db.scheduleBlock.createMany({
    data: [
      {
        userId: user.id,
        title: "Team standup",
        start: daysFromNow(0, 9, 0),
        end: daysFromNow(0, 9, 30),
        category: "work",
      },
      {
        userId: user.id,
        title: "Work block",
        start: daysFromNow(0, 10, 0),
        end: daysFromNow(0, 13, 0),
        category: "work",
      },
      // A scheduling conflict: two things overlapping tomorrow.
      {
        userId: user.id,
        title: "Client call",
        start: daysFromNow(1, 14, 0),
        end: daysFromNow(1, 15, 0),
        category: "work",
      },
      {
        userId: user.id,
        title: "Dentist appointment",
        start: daysFromNow(1, 14, 30),
        end: daysFromNow(1, 15, 30),
        category: "personal",
      },
      // Something scheduled past the user's noScheduleAfter (19:00) boundary.
      {
        userId: user.id,
        title: "Late study session",
        start: daysFromNow(2, 19, 30),
        end: daysFromNow(2, 21, 0),
        category: "education",
      },
      {
        userId: user.id,
        title: "Work block",
        start: daysFromNow(3, 9, 0),
        end: daysFromNow(3, 12, 0),
        category: "work",
      },
      {
        userId: user.id,
        title: "Work block",
        start: daysFromNow(4, 9, 0),
        end: daysFromNow(4, 17, 0),
        category: "work",
      },
    ],
  });

  // --- Shopping ------------------------------------------------------------
  await db.shoppingList.create({
    data: {
      userId: user.id,
      name: "Groceries",
      items: {
        create: [
          { name: "Bread" },
          { name: "Eggs", quantity: "1 dozen" },
          { name: "Chicken", quantity: "1kg" },
          { name: "Rice", quantity: "2kg" },
        ],
      },
    },
  });

  // --- Expenses: this month vs. last month, with an entertainment spike ---
  await db.expense.createMany({
    data: [
      // This month
      {
        userId: user.id,
        amount: 9500,
        category: "housing",
        date: monthsAgo(0, 1),
        description: "Rent",
      },
      {
        userId: user.id,
        amount: 1850,
        category: "food",
        date: monthsAgo(0, 3),
        description: "Groceries",
      },
      {
        userId: user.id,
        amount: 950,
        category: "transport",
        date: monthsAgo(0, 4),
        description: "Fuel",
      },
      {
        userId: user.id,
        amount: 1200,
        category: "utilities",
        date: monthsAgo(0, 5),
        description: "Electricity",
      },
      {
        userId: user.id,
        amount: 399,
        category: "subscriptions",
        date: monthsAgo(0, 2),
        description: "Streaming + cloud",
      },
      {
        userId: user.id,
        amount: 1450,
        category: "entertainment",
        date: monthsAgo(0, 6),
        description: "Concert tickets",
      },
      {
        userId: user.id,
        amount: 620,
        category: "entertainment",
        date: monthsAgo(0, 12),
        description: "Dining out",
      },
      // Last month (baseline for the "unusual increase" comparison)
      {
        userId: user.id,
        amount: 9500,
        category: "housing",
        date: monthsAgo(1, 1),
        description: "Rent",
      },
      {
        userId: user.id,
        amount: 1700,
        category: "food",
        date: monthsAgo(1, 3),
        description: "Groceries",
      },
      {
        userId: user.id,
        amount: 880,
        category: "transport",
        date: monthsAgo(1, 4),
        description: "Fuel",
      },
      {
        userId: user.id,
        amount: 1100,
        category: "utilities",
        date: monthsAgo(1, 5),
        description: "Electricity",
      },
      {
        userId: user.id,
        amount: 399,
        category: "subscriptions",
        date: monthsAgo(1, 2),
        description: "Streaming + cloud",
      },
      {
        userId: user.id,
        amount: 450,
        category: "entertainment",
        date: monthsAgo(1, 8),
        description: "Movies",
      },
    ],
  });

  await db.budget.createMany({
    data: [
      { userId: user.id, category: "food", monthlyLimit: 2000 },
      { userId: user.id, category: "entertainment", monthlyLimit: 500 },
    ],
  });

  // --- Routine ---------------------------------------------------------
  await db.routine.create({
    data: {
      userId: user.id,
      name: "Morning routine",
      frequency: "daily",
      steps: {
        create: [
          { title: "Wake up", order: 0, estimatedMinutes: 5 },
          { title: "Exercise", order: 1, estimatedMinutes: 20 },
          { title: "Shower", order: 2, estimatedMinutes: 15 },
          { title: "Breakfast", order: 3, estimatedMinutes: 15 },
          { title: "Review priorities", order: 4, estimatedMinutes: 5 },
        ],
      },
    },
  });

  console.log(`Seeded demo user: ${user.email} (id: ${user.id})`);
  console.log(`  Log in with password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
