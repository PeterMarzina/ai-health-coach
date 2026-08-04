// src/services/habitStreak.ts — streak-berekening voor habits (Deel B2)
// Puur functioneel. Twee smaken:
//  - 'daily' / 'weekdays'  → streak per kalenderdag (skip niet-geplande dagen
//    bij 'weekdays', die breken de streak niet en tellen ook niet mee).
//  - 'times_per_week'      → streak per WEEK: heb je deze week je doel gehaald,
//    dan telt de week mee, ongeacht welke dag. Voorkomt dat één gemiste dag
//    een streak breekt (AGENTS.md: "mensen stoppen met apps die ze straffen
//    voor één gemiste dag").
// De lopende (huidige) periode krijgt coulance: is die nog niet voltooid maar
// ook nog niet voorbij, dan telt hij niet mee én breekt hij de streak niet.

export type HabitScheduleType = 'daily' | 'times_per_week' | 'weekdays';

export type HabitSchedule = {
  type: HabitScheduleType;
  daysPerWeek?: number; // vereist bij 'times_per_week'
  weekdays?: number[]; // vereist bij 'weekdays'; 0 = zondag .. 6 = zaterdag
};

export type HabitEntryLite = { date: string; completed: boolean }; // date: YYYY-MM-DD

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(key: string, delta: number): string {
  const d = parseDateKey(key);
  d.setUTCDate(d.getUTCDate() + delta);
  return formatDateKey(d);
}

function weekdayOf(key: string): number {
  return parseDateKey(key).getUTCDay();
}

// Maandag van de week waarin `key` valt (ISO-week, ma–zo).
function mondayOf(key: string): string {
  const dow = weekdayOf(key); // 0=zo..6=za
  const mondayOffset = (dow + 6) % 7; // 0 als het al maandag is
  return addDays(key, -mondayOffset);
}

function completedSet(entries: HabitEntryLite[]): Set<string> {
  return new Set(entries.filter((e) => e.completed).map((e) => e.date));
}

function dailyCurrentStreak(completed: Set<string>, today: string): number {
  let cursor = completed.has(today) ? today : addDays(today, -1);
  let count = 0;
  // Bound op 10 jaar terug zodat een corrupte dataset nooit een oneindige lus geeft.
  for (let i = 0; i < 3650; i++) {
    if (!completed.has(cursor)) break;
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

function weekdaysCurrentStreak(completed: Set<string>, today: string, weekdays: number[]): number {
  if (!weekdays.length) return 0;
  const isScheduled = (key: string) => weekdays.includes(weekdayOf(key));
  let cursor = today;
  if (isScheduled(cursor) && !completed.has(cursor)) cursor = addDays(cursor, -1);
  let count = 0;
  for (let i = 0; i < 3650; i++) {
    if (!isScheduled(cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!completed.has(cursor)) break;
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

function countCompletedInWeek(completed: Set<string>, mondayKey: string): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (completed.has(addDays(mondayKey, i))) n++;
  return n;
}

function timesPerWeekCurrentStreak(completed: Set<string>, today: string, daysPerWeek: number): number {
  let weekStart = mondayOf(today);
  let count = 0;
  if (countCompletedInWeek(completed, weekStart) >= daysPerWeek) count++;
  // De huidige week telt hierboven mee als 'm/ie al gehaald is; is dat niet zo
  // dan krijgt hij coulance (nog niet voorbij) en gaan we gewoon door met de
  // vorige (wél afgeronde) weken.
  weekStart = addDays(weekStart, -7);
  for (let i = 0; i < 520; i++) {
    // 10 jaar aan weken
    if (countCompletedInWeek(completed, weekStart) < daysPerWeek) break;
    count++;
    weekStart = addDays(weekStart, -7);
  }
  return count;
}

export function computeCurrentStreak(
  schedule: HabitSchedule,
  entries: HabitEntryLite[],
  today: string
): number {
  const completed = completedSet(entries);
  if (schedule.type === 'daily') return dailyCurrentStreak(completed, today);
  if (schedule.type === 'weekdays') return weekdaysCurrentStreak(completed, today, schedule.weekdays ?? []);
  return timesPerWeekCurrentStreak(completed, today, schedule.daysPerWeek ?? 1);
}

// Langste streak ooit — zelfde regels, maar over de volledige geschiedenis.
export function computeLongestStreak(
  schedule: HabitSchedule,
  entries: HabitEntryLite[],
  today: string
): number {
  const completed = completedSet(entries);
  if (entries.length === 0) return 0;

  if (schedule.type === 'daily') {
    const dates = [...completed].sort();
    let longest = 0;
    let run = 0;
    let prev: string | null = null;
    for (const d of dates) {
      run = prev && addDays(prev, 1) === d ? run + 1 : 1;
      longest = Math.max(longest, run);
      prev = d;
    }
    return Math.max(longest, dailyCurrentStreak(completed, today));
  }

  if (schedule.type === 'weekdays') {
    const weekdays = schedule.weekdays ?? [];
    if (!weekdays.length) return 0;
    const scheduledDates = [...completed].filter((d) => weekdays.includes(weekdayOf(d))).sort();
    let longest = 0;
    let run = 0;
    let prevScheduled: string | null = null;
    for (const d of scheduledDates) {
      if (prevScheduled) {
        // Tel hoeveel geplande dagen er tussen prevScheduled en d liggen; is
        // dat precies opeenvolgend (geen gemiste geplande dag ertussen)?
        let cursor = addDays(prevScheduled, 1);
        let consecutive = true;
        while (cursor !== d) {
          if (weekdays.includes(weekdayOf(cursor))) { consecutive = false; break; }
          cursor = addDays(cursor, 1);
        }
        run = consecutive ? run + 1 : 1;
      } else {
        run = 1;
      }
      longest = Math.max(longest, run);
      prevScheduled = d;
    }
    return Math.max(longest, weekdaysCurrentStreak(completed, today, weekdays));
  }

  // times_per_week: bepaal per week (vanaf de vroegste entry t/m vorige week)
  // of het doel gehaald is, en zoek de langste aaneengesloten reeks.
  const daysPerWeek = schedule.daysPerWeek ?? 1;
  const allDates = entries.map((e) => e.date).sort();
  let weekCursor = mondayOf(allDates[0]);
  const currentWeekStart = mondayOf(today);
  let longest = 0;
  let run = 0;
  for (let i = 0; i < 520 && weekCursor < currentWeekStart; i++) {
    if (countCompletedInWeek(completed, weekCursor) >= daysPerWeek) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
    weekCursor = addDays(weekCursor, 7);
  }
  return Math.max(longest, timesPerWeekCurrentStreak(completed, today, daysPerWeek));
}
