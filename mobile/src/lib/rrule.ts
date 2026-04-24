import { RRule, rrulestr } from 'rrule';
import type { CalendarEventData } from './api';

export interface ExpandedOccurrence {
  event: CalendarEventData;
  date: Date;
}

export function expandEvents(events: CalendarEventData[], daysAhead = 30): ExpandedOccurrence[] {
  const now = new Date();
  const until = new Date();
  until.setDate(until.getDate() + daysAhead);

  const occurrences: ExpandedOccurrence[] = [];

  for (const event of events) {
    if (!event.active) continue;

    if (event.rrule && event.starts_at) {
      try {
        // Parse the RRULE and attach DTSTART from starts_at
        const dtstart = new Date(event.starts_at);
        const rule = rrulestr(`DTSTART:${formatRRuleDate(dtstart)}\nRRULE:${event.rrule}`);
        const dates = rule.between(now, until, true);

        for (const date of dates) {
          // Preserve the original time from starts_at
          date.setHours(dtstart.getHours(), dtstart.getMinutes(), 0, 0);
          occurrences.push({ event, date });
        }
      } catch {
        // Invalid RRULE — skip
      }
    } else if (event.starts_at && !event.rrule) {
      // One-off event
      const date = new Date(event.starts_at);
      if (date >= now && date <= until) {
        occurrences.push({ event, date });
      }
    }
    // Events with no starts_at are informational (moveable feasts with no date set)
  }

  occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
  return occurrences;
}

function formatRRuleDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}
