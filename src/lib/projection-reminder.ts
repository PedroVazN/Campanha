/** Lembrete: segunda e quarta, a partir das 9h (horário de Brasília). */

const REMINDER_HOUR = 9;
const REMINDER_WEEKDAYS = new Set([1, 3]); // Mon=1, Wed=3 (JS getDay)

export type BrasiliaParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
  dateKey: string;
};

export function getBrasiliaParts(date = new Date()): BrasiliaParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const hourRaw = get("hour");
  const hour = Number(hourRaw === "24" ? "0" : hourRaw);
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));

  return {
    year,
    month,
    day,
    hour,
    minute: Number(get("minute")),
    weekday: weekdayMap[get("weekday")] ?? 0,
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

/** True em seg/qua a partir das 9h (Brasília). */
export function isProjectionReminderWindow(date = new Date()): boolean {
  const br = getBrasiliaParts(date);
  if (!REMINDER_WEEKDAYS.has(br.weekday)) return false;
  return br.hour > REMINDER_HOUR || (br.hour === REMINDER_HOUR && br.minute >= 0);
}

export function isProjectionReminderDay(date = new Date()): boolean {
  return REMINDER_WEEKDAYS.has(getBrasiliaParts(date).weekday);
}

export function msUntilNextReminder(date = new Date()): number {
  const br = getBrasiliaParts(date);
  // Próxima ocorrência: próxima seg ou qua às 9:00 BRT
  for (let add = 0; add <= 8; add++) {
    const probe = new Date(date.getTime() + add * 24 * 60 * 60 * 1000);
    const p = getBrasiliaParts(probe);
    if (!REMINDER_WEEKDAYS.has(p.weekday)) continue;
    // alvo 9:00 no mesmo dia civil de Brasília
    const targetLocal = new Date(
      `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}T09:00:00-03:00`
    );
    const diff = targetLocal.getTime() - date.getTime();
    if (diff > 0) return diff;
  }
  return 24 * 60 * 60 * 1000;
}

export const PROJECTION_REMINDER_TITLE = "Atualize sua projeção de faturamento";
export const PROJECTION_REMINDER_BODY =
  "Lembrete de segunda e quarta, 9h: revise e atualize as projeções de pedidos.";
