-- G6: voice message attached to an announcement.
--
-- Abouna can record a short (default 120s max) voice note in the admin panel;
-- mobile shows an inline audio player in the Inbox card and the push
-- notification is prefixed with a 🎤 icon.
--
-- Both columns nullable — most announcements stay text-only.
-- voice_url is a path under /uploads (public static) or any https URL.

ALTER TABLE announcements
  ADD COLUMN voice_url VARCHAR(500) NULL AFTER stream_url,
  ADD COLUMN voice_duration_ms INT NULL AFTER voice_url;
