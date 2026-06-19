import type { CalendarEvent, Goal, Post, StoryLog, TeamMember } from "./mockData";
import { getGoalResponsibleIds } from "./mockData";
import { getCalendarResponsibleIds, getCalendarChecklistProgress } from "./calendarWorkflow";

type SeriesPoint = { month: string; posts: number };
type RadarPoint = { subject: string; value: number };
type TeamProfileBase = TeamMember & {
  userId: string;
  email: string;
  avatarUrl: string;
  bio: string;
  password?: string;
};

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split("-").map((value) => Number(value));
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return key;
  }

  return `${monthNames[month - 1]}/${String(year).slice(-2)}`;
}

function parseKey(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildMonthlySeries(posts: Post[], stories: StoryLog[], memberId: number): SeriesPoint[] {
  const counts = new Map<string, number>();

  posts
    .filter((post) => post.authorId === memberId)
    .forEach((post) => {
      const parsed = parseKey(post.date);
      if (!parsed) {
        return;
      }

      const key = formatMonthKey(parsed);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

  stories
    .filter((story) => story.madeById === memberId)
    .forEach((story) => {
      const parsed = parseKey(story.date);
      if (!parsed) {
        return;
      }

      const key = formatMonthKey(parsed);
      counts.set(key, (counts.get(key) ?? 0) + story.quantity);
    });

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const cursor = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return formatMonthKey(cursor);
  });

  return months.map((key) => ({
    month: monthLabelFromKey(key),
    posts: counts.get(key) ?? 0,
  }));
}

function buildRadarPoints({
  postsCreated,
  avgEngagement,
  goalsCompletedRate,
  punctuality,
  cadence,
}: {
  postsCreated: number;
  avgEngagement: number;
  goalsCompletedRate: number;
  punctuality: number;
  cadence: number;
}): RadarPoint[] {
  return [
    { subject: "Execucao", value: clamp(Math.round(postsCreated * 4 + cadence * 3), 0, 100) },
    { subject: "Criatividade", value: clamp(Math.round(avgEngagement * 8 + cadence * 2), 0, 100) },
    { subject: "Agilidade", value: clamp(Math.round(punctuality), 0, 100) },
    { subject: "Qualidade", value: clamp(Math.round(goalsCompletedRate * 0.9 + avgEngagement * 2), 0, 100) },
    { subject: "Consistencia", value: clamp(Math.round((cadence + punctuality) / 2), 0, 100) },
  ];
}

export function deriveTeamProfiles<T extends TeamProfileBase>(
  members: T[],
  posts: Post[],
  goals: Goal[],
  calendarEvents: CalendarEvent[],
  stories: StoryLog[],
) {
  return members.map((member) => {
    const memberPosts = posts.filter((post) => post.authorId === member.id);
    const memberGoals = goals.filter((goal) => getGoalResponsibleIds(goal).includes(member.id));
    const memberCalendar = calendarEvents.filter((event) => getCalendarResponsibleIds(event).includes(member.id));

    const postsCreated = memberPosts.length;
    const totalReach = memberPosts.reduce((sum, post) => sum + post.reach, 0);
    const totalEngagement = memberPosts.reduce((sum, post) => sum + post.engagement, 0);
    const avgEngagement = totalReach > 0 ? Number(((totalEngagement / totalReach) * 100).toFixed(1)) : 0;
    const goalsCompleted = memberGoals.filter((goal) => goal.current >= goal.target).length;
    const goalsCompletedRate = memberGoals.length > 0 ? (goalsCompleted / memberGoals.length) * 100 : 0;
    const completedCalendarTasks = memberCalendar.filter((event) => getCalendarChecklistProgress(event).isComplete).length;
    const punctuality = memberCalendar.length > 0 ? (completedCalendarTasks / memberCalendar.length) * 100 : 0;
    const monthlyPosts = buildMonthlySeries(posts, stories, member.id);
    const averageMonthlyCadence =
      monthlyPosts.length > 0 ? monthlyPosts.reduce((sum, point) => sum + point.posts, 0) / monthlyPosts.length : 0;
    const peakMonthlyCadence = monthlyPosts.reduce((max, point) => Math.max(max, point.posts), 0) || 1;
    const cadence = (averageMonthlyCadence / peakMonthlyCadence) * 100;
    const performance = clamp(
      Math.round(postsCreated * 2 + avgEngagement * 2 + goalsCompletedRate * 0.25 + punctuality * 0.2),
      0,
      100,
    );

    return {
      ...member,
      stats: {
        postsCreated,
        avgEngagement,
        goalsCompleted,
        performance,
        punctuality: Math.round(punctuality),
        monthlyViews: member.stats.monthlyViews ?? 0,
      },
      radar: buildRadarPoints({
        postsCreated,
        avgEngagement,
        goalsCompletedRate,
        punctuality,
        cadence,
      }),
      monthlyPosts,
    } as T;
  });
}
