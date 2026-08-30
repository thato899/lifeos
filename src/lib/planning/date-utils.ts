/**
 * All scheduling math in this module (working hours, noScheduleAfter, etc.)
 * is expressed in local-time "minutes since midnight" and local calendar
 * days — there is no timezone conversion anywhere in planDay/planWeek. Day
 * keys must therefore be derived from local date components, never from
 * `Date#toISOString()`, which is UTC and silently rolls a local midnight
 * back to the previous day for any timezone ahead of UTC.
 */
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
