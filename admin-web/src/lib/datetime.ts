/**
 * Timezone-aware date formatting. The parish operates on Moscow time
 * (Europe/Moscow, UTC+3, no DST since 2014). ALL displayed dates and times
 * should go through these helpers so users in other timezones (Abouna
 * traveling, a parishioner abroad, an admin in Cairo) still see services
 * and announcements at Moscow time.
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

/** Full date + time in Moscow timezone. Example: "24 апр. 2026 г., 18:30" */
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

/** Date only. Example: "24 апр. 2026 г." */
export function formatMoscowDate(
  input: string | Date | null | undefined,
  lang?: string,
): string {
  const d = parse(input);
  if (!d) return '—';
  return d.toLocaleDateString(localeFor(lang), {
    timeZone: MOSCOW_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Time only. Example: "18:30" */
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
