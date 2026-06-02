import type { CalendarEvent, Goal, Idea, Post, StoryLog } from "./mockData";

export type MonthlyArchiveSnapshot = {
  monthKey: string;
  posts: Post[];
  goals: Goal[];
  ideas: Idea[];
  calendarEvents: CalendarEvent[];
  storyLogs: StoryLog[];
};

export function createEmptyMonthlyArchive(): MonthlyArchiveSnapshot {
  return {
    monthKey: "",
    posts: [],
    goals: [],
    ideas: [],
    calendarEvents: [],
    storyLogs: [],
  };
}

