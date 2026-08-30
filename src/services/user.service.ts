import { db } from "@/lib/db";
import type {
  SchedulingPreferences,
  UnavailablePeriod,
} from "@/lib/planning/types";

export async function getSchedulingPreferences(
  userId: string,
): Promise<SchedulingPreferences> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  return {
    timezone: user.timezone,
    workingHoursStart: user.workingHoursStart,
    workingHoursEnd: user.workingHoursEnd,
    noScheduleAfter: user.noScheduleAfter,
    unavailablePeriods:
      (user.unavailablePeriods as unknown as UnavailablePeriod[] | null) ?? [],
  };
}

export async function updateSchedulingPreferences(
  userId: string,
  fields: Partial<{
    workingHoursStart: string;
    workingHoursEnd: string;
    noScheduleAfter: string | null;
    timezone: string;
  }>,
) {
  return db.user.update({ where: { id: userId }, data: fields });
}
