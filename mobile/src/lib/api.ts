import { API_BASE_URL } from './constants';

async function request<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface CalendarEventData {
  id: number;
  title_ar: string;
  title_ru: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_ru: string | null;
  description_en: string | null;
  rrule: string | null;
  starts_at: string | null;
  duration_minutes: number;
  reminder_minutes_before: number;
  active: number;
  updated_at: string;
}

export interface AnnouncementData {
  id: number;
  title_ar: string;
  title_ru: string | null;
  title_en: string | null;
  body_ar: string;
  body_ru: string | null;
  body_en: string | null;
  priority: 'normal' | 'high' | 'critical';
  category: 'service' | 'announcement';
  stream_url?: string | null;
  voice_url?: string | null;
  voice_duration_ms?: number | null;
  sent_at: string | null;
  created_at: string;
}

export async function registerDevice(data: {
  fcm_token: string;
  platform: 'ios' | 'android';
  app_version: string;
  language: string;
  preferences: { services: boolean; announcements: boolean };
}): Promise<boolean> {
  const result = await request('/devices/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result !== null;
}

export async function heartbeat(fcm_token: string): Promise<void> {
  await request('/devices/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ fcm_token }),
  });
}

export async function updateDevicePreferences(data: {
  fcm_token: string;
  language?: string;
  preferences?: { services: boolean; announcements: boolean };
}): Promise<void> {
  await request('/devices/preferences', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function fetchCalendar(since?: string): Promise<CalendarEventData[]> {
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  return (await request<CalendarEventData[]>(`/calendar${query}`)) || [];
}

export async function fetchAnnouncements(limit = 50): Promise<AnnouncementData[]> {
  return (await request<AnnouncementData[]>(`/announcements?limit=${limit}`)) || [];
}
