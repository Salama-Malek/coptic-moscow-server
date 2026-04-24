export interface Admin {
  id: number;
  display_name: string;
  email: string;
  role: 'super_admin' | 'admin';
  language: 'ar' | 'ru' | 'en';
  must_change_password: boolean;
}

export interface Announcement {
  id: number;
  title_ar: string;
  title_ru: string | null;
  title_en: string | null;
  body_ar: string;
  body_ru: string | null;
  body_en: string | null;
  priority: 'normal' | 'high' | 'critical';
  category: 'service' | 'announcement';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'send_failed' | 'cancelled';
  scheduled_for: string | null;
  sent_at: string | null;
  created_by: number;
  created_by_name?: string;
  template_id: number | null;
  stream_url: string | null;
  voice_url: string | null;
  voice_duration_ms: number | null;
  created_at: string;
  sent_count?: number;
  failed_count?: number;
}

export interface CalendarEvent {
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

export interface Template {
  id: number;
  name_ar: string;
  name_ru: string | null;
  name_en: string | null;
  category: string;
  body_ar_template: string;
  body_ru_template: string | null;
  body_en_template: string | null;
  placeholders: PlaceholderDef[];
  created_at: string;
  updated_at: string;
}

export interface PlaceholderDef {
  key: string;
  label_ar: string;
  label_ru?: string;
  label_en?: string;
  type: 'text' | 'date' | 'time' | 'datetime' | 'boolean' | 'number';
  default?: string | number | boolean;
  optional?: boolean;
}

export interface Snippet {
  key: string;
  value_ar: string;
  value_ru: string | null;
  value_en: string | null;
  updated_at: string;
}

export interface Stats {
  total_devices: number;
  active_7d: number;
  active_30d: number;
  by_language: Array<{ language: string; count: number }>;
  last_announcements: Announcement[];
}

export type Language = 'ar' | 'ru' | 'en';
