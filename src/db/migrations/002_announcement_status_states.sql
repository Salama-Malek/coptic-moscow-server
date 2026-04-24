-- Adds 'sending' and 'send_failed' to announcements.status enum.
--
-- Why:
--   - 'sending' lets the send-due cron atomically claim a row ('scheduled' -> 'sending')
--     before starting the FCM multicast, preventing overlapping cron runs from
--     double-dispatching the same announcement.
--   - 'send_failed' records FCM dispatch failure so the UI can show a retry banner
--     instead of silently showing 'sent' on a row that never left the server.
--
-- The 'sent' default is preserved for the immediate-send code path that inserts then
-- calls FCM inline — application code now inserts with 'sending' instead on that path.

ALTER TABLE announcements
  MODIFY COLUMN status
    ENUM('draft', 'scheduled', 'sending', 'sent', 'send_failed', 'cancelled')
    NOT NULL DEFAULT 'sent';
