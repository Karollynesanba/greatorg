import { getBrazilMonthKey } from "./brazilDate";
import type { Goal } from "./mockData";

function parseDateKey(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isDateInRange(dateKey: string, start: Date, end: Date) {
  const parsed = parseDateKey(dateKey);

  if (!parsed) {
    return false;
  }

  return parsed >= start && parsed <= end;
}

export function isDateInBrazilMonth(dateKey: string, anchorDate = new Date()) {
  return dateKey.startsWith(getBrazilMonthKey(anchorDate));
}

export function filterItemsInBrazilMonth<T extends { date: string }>(items: T[], anchorDate = new Date()) {
  const monthKey = getBrazilMonthKey(anchorDate);
  return items.filter((item) => item.date.startsWith(monthKey));
}

export function getGoalHistoryEntries(goal: Goal) {
  return [...(goal.history ?? [])].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function getGoalHistoryTotalInRange(goal: Goal, start: Date, end: Date) {
  return getGoalHistoryEntries(goal)
    .filter((entry) => isDateInRange(entry.date, start, end))
    .reduce((sum, entry) => sum + Math.max(entry.value, 0), 0);
}

export function getGoalCurrentMonthTotal(goal: Goal, anchorDate = new Date()) {
  return getGoalHistoryEntries(goal)
    .filter((entry) => isDateInBrazilMonth(entry.date, anchorDate))
    .reduce((sum, entry) => sum + Math.max(entry.value, 0), 0);
}

export function isCypressRecord(value: unknown) {
  try {
    return JSON.stringify(value).toLowerCase().includes("cypress");
  } catch {
    return false;
  }
}
