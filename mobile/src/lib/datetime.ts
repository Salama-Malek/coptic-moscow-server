/**
 * Timezone-aware date formatting. The parish operates on Moscow time
 * (Europe/Moscow, UTC+3, no DST since 2014). All displayed dates and times
 * use Moscow TZ regardless of the phone's local timezone — a parishioner
 * traveling to Cairo still sees services at their true Moscow time.
 */

export const MOSCOW_TZ = 'Europe/Moscow';

type LocaleCode = 'ar' | 'ru' | 'en';

const LOCALE_MAP: Record<LocaleCode, string> = {
  ar: 'ar-EG',
  ru: 'ru-RU',
  en: 'en-US',
};

function localeFor(lang?: string): string {
  return LOCALE_MAP[(lang as LocaleCode) || 'ar'] || 'ar-EG';
}

function parse(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export function formatMoscowDate(
  input: string | Date | null | undefined,
  lang?: string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = parse(input);
  if (!d) return '—';
  return d.toLocaleDateString(localeFor(lang), {
    timeZone: MOSCOW_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...opts,
  });
}

export function formatMoscowTime(
  input: string | Date | null | undefined,
  lang?: string,
): string {
  const d = parse(input);
  if (!d) return '—';
  return d.toLocaleTimeString(localeFor(lang), {
    timeZone: MOSCOW_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMoscowDateTime(
  input: string | Date | null | undefined,
  lang?: string,
): string {
  const d = parse(input);
  if (!d) return '—';
  return d.toLocaleString(localeFor(lang), {
    timeZone: MOSCOW_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Day number in Moscow TZ — e.g. 24 */
export function moscowDayOfMonth(
  input: string | Date | null | undefined,
): number | null {
  const d = parse(input);
  if (!d) return null;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MOSCOW_TZ,
    day: 'numeric',
  });
  return parseInt(formatter.format(d), 10);
}

/** Month short name in Moscow TZ, respecting locale. e.g. "апр." */
export function moscowMonthShort(
  input: string | Date | null | undefined,
  lang?: string,
): string {
  const d = parse(input);
  if (!d) return '';
  return d.toLocaleDateString(localeFor(lang), {
    timeZone: MOSCOW_TZ,
    month: 'short',
  });
}

/** Weekday long name in Moscow TZ, respecting locale. e.g. "пятница" */
export function moscowWeekdayLong(
  input: string | Date | null | undefined,
  lang?: string,
): string {
  const d = parse(input);
  if (!d) return '';
  return d.toLocaleDateString(localeFor(lang), {
    timeZone: MOSCOW_TZ,
    weekday: 'long',
  });
}
