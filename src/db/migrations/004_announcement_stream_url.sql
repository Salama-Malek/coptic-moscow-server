-- G3: optional live-stream URL attached to an announcement.
--
-- When set, the mobile app shows a "Watch" action on the notification that
-- opens the URL (YouTube/VK Live/etc.). Backend simply passes it through in
-- the FCM data payload; no validation of provider.
--
-- Nullable — existing announcements and most announcements don't need it.

ALTER TABLE announcements
  ADD COLUMN stream_url VARCHAR(500) NULL AFTER template_id;
