// Coptic Orthodox fasting calendar engine.
//
// Returns the fasting rule for any Gregorian date. Pure function — no storage,
// no server dependency, safe to call from render.
//
// Rules implemented (Coptic Orthodox tradition, simplified for parish daily use):
//
//   Precedence (highest first):
//     1. Great Feast day                     -> 'none'
//     2. Bright Week (Pascha..Pascha+6)     -> 'none'
//     3. Pentecost period (Pascha+7..+49)   -> 'none' (no weekly fast either)
//     4. Great Lent / Holy Week / Jonah /
//        Dormition Fast weekdays            -> 'strict'
//        (Sat/Sun of Great Lent             -> 'wine_oil', slightly relaxed)
//     5. Apostles' Fast / Nativity Fast     -> 'fish' (milder — fish allowed)
//     6. Weekly Wednesday / Friday          -> 'fish'
//     7. Otherwise                          -> 'none'
//
// Orthodox Pascha is computed via the Meeus Julian-Paschalion formula, then
// offset +13 days for Julian→Gregorian in the 21st century.

export type FastType = 'strict' | 'wine_oil' | 'fish' | 'none';

// i18n keys — translated in locale files.
export type FastPeriodKey =
  | 'feast_major'
  | 'bright_week'
  | 'pentecost_period'
  | 'great_lent'
  | 'holy_week'
  | 'jonah_fast'
  | 'dormition_fast'
  | 'apostles_fast'
  | 'nativity_fast'
  | 'weekly_wed_fri'
  | 'ordinary';

export interface FastingDay {
  type: FastType;
  period: FastPeriodKey;
  /** Specific named feast if this day is one (e.g. 'feast_nativity'); else null. */
  feastKey: string | null;
}

// --- Pascha calculation (Orthodox / Coptic — both use Julian Paschalion) ---

function orthodoxPascha(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const julianDayOfYearOffset = d + e + 114;
  const julianMonth = Math.floor(julianDayOfYearOffset / 31); // 3 or 4
  const julianDay = (julianDayOfYearOffset % 31) + 1;

  // Julian date built in a Date using UTC to avoid DST surprises, then +13 for
  // the 21st-century Julian→Gregorian offset. Years 2100+ need +14; adjust
  // then if this project is still alive. :)
  const julianDate = new Date(Date.UTC(year, julianMonth - 1, julianDay));
  julianDate.setUTCDate(julianDate.getUTCDate() + 13);
  // Strip time; return a local-midnight Date for easy comparisons.
  return new Date(julianDate.getUTCFullYear(), julianDate.getUTCMonth(), julianDate.getUTCDate());
}

// --- Date helpers ---

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function daysBetween(earlier: Date, later: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / 86_400_000);
}

/** Is `d` in [start, end] inclusive (date-only compare). */
function inRange(d: Date, start: Date, end: Date): boolean {
  const t = stripTime(d).getTime();
  return t >= stripTime(start).getTime() && t <= stripTime(end).getTime();
}

// --- Feast lookup ---

/** Fixed Gregorian-date feasts (simplified for 21st-century Coptic diaspora practice). */
interface FixedFeast {
  month: number; // 1-12
  day: number;
  key: string;
}

const FIXED_FEASTS: FixedFeast[] = [
  { month: 1, day: 7, key: 'feast_nativity' },
  { month: 1, day: 19, key: 'feast_theophany' },
  { month: 3, day: 21, key: 'feast_annunciation' },
  { month: 4, day: 7, key: 'feast_annunciation' }, // Coptic diaspora often observes April 7
  { month: 8, day: 19, key: 'feast_transfiguration' },
  { month: 8, day: 22, key: 'feast_dormition' },
  { month: 9, day: 11, key: 'feast_nayrouz' },
  { month: 9, day: 27, key: 'feast_cross' },
  { month: 12, day: 2, key: 'feast_presentation' },
];

function fixedFeastOn(d: Date): string | null {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const match = FIXED_FEASTS.find((f) => f.month === m && f.day === day);
  return match?.key ?? null;
}

/** Pascha-relative movable feasts (feasts only, not fast periods). */
function movableFeastOn(d: Date, pascha: Date): string | null {
  const offset = daysBetween(pascha, stripTime(d));
  if (offset === -7) return 'feast_palm_sunday';
  if (offset === 0) return 'feast_pascha';
  if (offset >= 1 && offset <= 6) return 'feast_bright_week';
  if (offset === 39) return 'feast_ascension';
  if (offset === 49) return 'feast_pentecost';
  return null;
}

// --- Fast period lookup ---

/** Nativity Fast: Nov 25 of year Y through Jan 6 of year Y+1 (both inclusive). */
function inNativityFast(d: Date): boolean {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (m === 11 && day >= 25) return true;
  if (m === 12) return true;
  if (m === 1 && day <= 6) return true;
  return false;
}

/** Dormition/St Mary's Fast: August 7 through August 21 (Gregorian, inclusive). */
function inDormitionFast(d: Date): boolean {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return m === 8 && day >= 7 && day <= 21;
}

// --- Main engine ---

export function getFastingDay(date: Date): FastingDay {
  const day = stripTime(date);
  const year = day.getFullYear();
  const pascha = orthodoxPascha(year);
  // All Pascha-relative events (Jonah, Great Lent, Pentecost, Apostles) fall in Jan–July.
  // For dates in those months we compare to this year's Pascha. Events never straddle
  // year boundaries, so no previous-year lookup is needed for Pascha math.
  const offset = daysBetween(pascha, day);

  // 1. Major feast override -------------------------------------------------
  const fixedFeast = fixedFeastOn(day);
  if (fixedFeast) {
    return { type: 'none', period: 'feast_major', feastKey: fixedFeast };
  }
  const movableFeast = movableFeastOn(day, pascha);
  if (movableFeast) {
    return {
      type: 'none',
      period: movableFeast === 'feast_bright_week' ? 'bright_week' : 'feast_major',
      feastKey: movableFeast,
    };
  }

  // 2. Pentecost period (Pascha+1..Pascha+49) -----------------------------
  if (offset >= 1 && offset <= 49) {
    return { type: 'none', period: 'pentecost_period', feastKey: null };
  }

  // 3. Jonah's Fast: 3 days at Pascha - 69..-67 (Mon/Tue/Wed) --------------
  if (offset >= -69 && offset <= -67) {
    return { type: 'strict', period: 'jonah_fast', feastKey: null };
  }

  // 4. Great Lent + Holy Week: Pascha - 55 (Clean Monday) .. Pascha - 1 ----
  if (offset >= -55 && offset <= -1) {
    const isHolyWeek = offset >= -6;
    if (isHolyWeek) {
      return { type: 'strict', period: 'holy_week', feastKey: null };
    }
    const dow = day.getDay();
    const isWeekend = dow === 0 || dow === 6;
    return { type: isWeekend ? 'wine_oil' : 'strict', period: 'great_lent', feastKey: null };
  }

  // 5. Apostles' Fast: Pascha + 50 .. July 11 (inclusive) ------------------
  if (offset >= 50) {
    const julyEnd = new Date(year, 6, 11);
    if (day.getTime() <= julyEnd.getTime()) {
      return { type: 'fish', period: 'apostles_fast', feastKey: null };
    }
  }

  // 6. Dormition Fast (Aug 7–21, Gregorian) --------------------------------
  if (inDormitionFast(day)) {
    return { type: 'strict', period: 'dormition_fast', feastKey: null };
  }

  // 7. Nativity Fast (Nov 25 – Jan 6) --------------------------------------
  if (inNativityFast(day)) {
    return { type: 'fish', period: 'nativity_fast', feastKey: null };
  }

  // 8. Weekly Wednesday / Friday -------------------------------------------
  const dow = day.getDay();
  if (dow === 3 || dow === 5) {
    return { type: 'fish', period: 'weekly_wed_fri', feastKey: null };
  }

  // 9. Ordinary --------------------------------------------------------------
  return { type: 'none', period: 'ordinary', feastKey: null };
}

// --- Utilities for UI ---

/** True if `date` has any kind of fast (anything other than 'none'). */
export function isFastingDay(date: Date): boolean {
  return getFastingDay(date).type !== 'none';
}

/** Return [start, end] inclusive of the month containing `date`. */
export function monthRange(date: Date): { start: Date; end: Date; weeks: Date[][] } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  // Build a weeks-aligned grid (Sunday-first) for a calendar UI.
  const firstCellDow = start.getDay();
  const gridStart = addDays(start, -firstCellDow);
  const weeks: Date[][] = [];
  let cursor = gridStart;
  while (cursor <= end || weeks.length < 6) {
    const row: Date[] = [];
    for (let i = 0; i < 7; i++) {
      row.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(row);
    if (weeks.length === 6) break;
  }
  return { start, end, weeks };
}

export function orthodoxPaschaFor(year: number): Date {
  return orthodoxPascha(year);
}

/** Dev-only — used to hand-verify golden days during development. */
export const _internals = { orthodoxPascha, sameDay, daysBetween, addDays, stripTime };
