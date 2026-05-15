import type { Goal, HistoryEvent, StoryLog } from "./mockData";

const storyHistoryBaseId = 100000;
const goalHistoryBaseId = 200000;

function getCalendarDateTime(date: string, time?: string) {
  return `${date}${time ? ` ${time}` : ""}`;
}

export function getStoryHistoryId(storyId: number) {
  return storyHistoryBaseId + storyId;
}

export function getGoalHistoryId(goalId: number) {
  return goalHistoryBaseId + goalId;
}

export function upsertHistoryEvent(previous: HistoryEvent[], nextEvent: HistoryEvent) {
  const exists = previous.some((item) => item.id === nextEvent.id);
  if (!exists) {
    return [nextEvent, ...previous];
  }

  return previous.map((item) => (item.id === nextEvent.id ? nextEvent : item));
}

export function removeHistoryEvent(previous: HistoryEvent[], historyId: number) {
  return previous.filter((item) => item.id !== historyId);
}

export function buildStoryHistoryEvent(
  story: StoryLog,
  actorName: string,
  action: "created" | "updated" | "deleted",
): HistoryEvent {
  const actionLabels = {
    created: "criado",
    updated: "atualizado",
    deleted: "removido",
  } as const;

  return {
    id: getStoryHistoryId(story.id),
    type: "post",
    title: `Story ${actionLabels[action]}`,
    description: `${actorName} ${actionLabels[action]} ${story.quantity} story(ies) em ${getCalendarDateTime(story.date, story.time)}.`,
    authorId: story.madeById,
    date: story.date,
    result: story.status ?? "Registro salvo",
    metrics: `${story.quantity} stories`,
  };
}

export function buildGoalHistoryEvent(
  goal: Goal,
  actorName: string,
  action: "created" | "updated" | "deleted",
): HistoryEvent {
  const actionLabels = {
    created: "criada",
    updated: "atualizada",
    deleted: "removida",
  } as const;

  const completed = goal.current >= goal.target;

  return {
    id: getGoalHistoryId(goal.id),
    type: "goal",
    title: `Meta ${actionLabels[action]}`,
    description: `${actorName} ${actionLabels[action]} a meta "${goal.name}".`,
    authorId: goal.responsibleId,
    date: goal.deadline,
    result: completed ? "Meta concluída" : `${goal.current}/${goal.target} em andamento`,
    metrics: `${goal.checklist?.filter((item) => item.done).length ?? 0}/${goal.checklist?.length ?? 0} itens`,
  };
}
