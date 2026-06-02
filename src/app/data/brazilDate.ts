const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createUtcNoonDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export function getBrazilDateKey(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return formatDateKey(date);
  }

  return `${year}-${month}-${day}`;
}

export function getBrazilMonthKey(date: Date = new Date()) {
  return getBrazilDateKey(date).slice(0, 7);
}

export function shiftBrazilDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return dateKey;
  }

  const shifted = createUtcNoonDate(year, month, day);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return getBrazilDateKey(shifted);
}

export function formatBrazilDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return dateKey;
  }

  const date = createUtcNoonDate(year, month, day);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function getBrazilYesterdayDateKey(date: Date = new Date()) {
  return shiftBrazilDateKey(getBrazilDateKey(date), -1);
}
