# Test Plan — `audit/pre-launch-fixes`

11 commits across P0 fixes, observability, 2 growth features, voice messages. This plan walks through verifying each one. Tick boxes as you go.

**Critical path:** complete § 1 (pre-deploy) → § 3 (smoke tests) before opening the app to users. § 2 (local test) is optional.

---

## § 1 — Pre-deploy checklist (DO THIS FIRST)

### Hostinger environment variables

Set all of these in the Hostinger Node.js panel. Missing ones will break the corresponding features.

- [ ] `TZ=Europe/Moscow` — **C3 runbook.** Without this, scheduled announcements fire at UTC, not Moscow time. **Most likely single thing to break prod.**
- [ ] `UPLOADS_DIR=/home/<your-user>/uploads` — absolute path, outside the git-deployed repo. Create the directory once: `mkdir -p ~/uploads/announcements`. Without this, git auto-deploy wipes voice uploads on every push.
- [ ] `PUBLIC_BASE_URL=https://coptic-notify.sm4tech.com` — makes voice-upload URLs absolute. Without this, mobile may resolve voice URLs against wrong origin.
- [ ] `CRON_SECRET` — confirm it's still set (existing).
- [ ] `JWT_SECRET` + `CORS_ORIGINS` + `FIREBASE_SERVICE_ACCOUNT_PATH` — confirm still set (existing).
- [ ] `NODE_ENV=production` — so pino logs JSON (not pretty-print) and loginLimiter enforces 5 attempts not 50.

### Verify migration path will apply cleanly

Migrations 002, 003, 004, 005 auto-apply in order on next server start. They are non-destructive (enum expansion + column additions + table addition). No manual SQL needed.

- [ ] SSH to Hostinger or open the phpMyAdmin panel
- [ ] `SELECT filename FROM _migrations;` — confirm 001_initial is applied (001 is the baseline)
- [ ] Confirm MySQL user has `ALTER TABLE` + `CREATE TABLE` privileges (it does — it ran 001)

### Verify production timezone (C3 runbook repeat)

- [ ] Run on prod MySQL:
  ```sql
  SELECT @@global.time_zone AS global_tz,
         @@session.time_zone AS session_tz,
         NOW() AS mysql_now,
         UTC_TIMESTAMP() AS utc_now;
  ```
  **Pass:** `session_tz` is `+03:00` or `Europe/Moscow`, and `mysql_now` is 3h ahead of `utc_now`.
  **Fail:** set `TZ=Europe/Moscow` env, restart Node, re-run.

### Merge & deploy

- [ ] Review PR: https://github.com/Salama-Malek/coptic-moscow-app/pull/new/audit/pre-launch-fixes
- [ ] Merge to `main` — Hostinger auto-deploys
- [ ] Tail the Hostinger Runtime Logs during startup; look for these lines:
  - `[migrate] Applied 002_announcement_status_states.sql` (etc for 003, 004, 005)
  - `[server] static uploads dir` with your UPLOADS_DIR path
  - `[server] Coptic Moscow API listening` on port
  - No `[fatal]` lines
- [ ] Hit `https://coptic-notify.sm4tech.com/api/health` in a browser — should be `{"status":"ok",...}` with `db.ok:true` and `firebase.ok:true`. If `firebase.ok:false`, check `FIREBASE_SERVICE_ACCOUNT_PATH`.

---

## § 2 — Local test (optional, before deploy)

Only needed if you want to click through before merging. Mobile features need a real Android device pointed at a reachable server — skip if that's a hassle.

### Server + admin-web locally

```bash
# Terminal 1 — server
cd server
# copy .env.example to .env if you haven't, point at a local MySQL
npm run dev  # or: npx tsx src/index.ts

# Terminal 2 — admin-web (Vite HMR)
cd server/admin-web
npm run dev
```

- [ ] Open `http://localhost:5173/admin`, log in
- [ ] Click through Dashboard → New Announcement → System Health (super-admin) → Calendar → Team
- [ ] Create a test announcement, attach a voice message via the recorder, save as draft
- [ ] Open the draft again via History → EditAnnouncementModal, confirm voice shows the playback button

### Mobile locally

Skippable unless you want to validate the fasting calendar + voice player without FCM.

- [ ] `cd mobile && npx expo start --dev-client`
- [ ] Install the built dev client on your Android device
- [ ] Fasting tile on Home — today's status appears
- [ ] Tap tile → FastingScreen opens, month grid renders, navigation works
- [ ] Send yourself a test announcement with voice via admin-web pointed at local server — phone receives, player renders, plays

---

## § 3 — Post-deploy smoke tests (DO THESE ON PROD)

Order matters — do them top to bottom.

### 3.1 Health + observability (§ commits a46bcb4, 64e9461, f02302e)

- [ ] `curl https://coptic-notify.sm4tech.com/api/health` → 200 with db.ok + firebase.ok both true
- [ ] Log in to admin, open **System Health** (super-admin only, in sidebar)
  - [ ] DB status green with ms latency visible
  - [ ] Firebase status green
  - [ ] Cron runs table — may be empty until cron fires; that's expected on day 1
  - [ ] Device stats populated
  - [ ] Recent audit log has your login entry

### 3.2 C1 + C2: cron double-send prevention + FCM failure visibility

- [ ] Admin → New Announcement → set `scheduled_for` = 2 minutes from now → save
- [ ] Announcement shows `Scheduled` in History
- [ ] Wait for the cron to fire; Hostinger Runtime Logs should show `[cron] Sent announcement ...`
- [ ] Mobile receives **exactly one** notification
- [ ] System Health → Cron runs shows a new `send-due` row with status `ok` and `duration_ms`
- [ ] History row now shows `Sent` (not stuck at `sending`) + sent/failed counts

If you want to stress C1 (double-send prevention):
- [ ] Manually trigger the cron twice within 1 second:
  ```bash
  curl -X POST -H "X-CRON-SECRET: <secret>" https://coptic-notify.sm4tech.com/api/cron/send-due &
  curl -X POST -H "X-CRON-SECRET: <secret>" https://coptic-notify.sm4tech.com/api/cron/send-due &
  ```
  One run returns `claimed > 0`, the other returns `skipped > 0`. Mobile still receives exactly one push.

### 3.3 Rate limits (§ commit acfe40b)

- [ ] Attempt 6+ failed logins in a row → 6th should return 429 `TOO_MANY_REQUESTS`
- [ ] Try sending 31 announcements in 15 min (as admin) → 31st returns 429 `TOO_MANY_REQUESTS`

### 3.4 G2 Fasting calendar (§ commit bfb738f)

- [ ] Open mobile Home → fasting tile shows today's status, tappable
- [ ] Tap → FastingScreen opens; month grid with color dots on fasting days
- [ ] Verify some known dates:
  - **Dec 25** — green dot (fish / Nativity Fast)
  - **Jan 7** — no dot (Feast of Nativity)
  - **Next Wednesday or Friday** (outside Pentecost period) — green dot (fish / weekly)
  - **A weekday in late March / early April 2026** — brown dot (strict / Great Lent)
- [ ] Prev/next month buttons work

### 3.5 G3 Live-stream + Tap-to-Watch (§ commit e951ad3)

- [ ] Admin → New Announcement → paste a YouTube or any HTTPS URL in **Live-stream URL**, fill title/body, Send now
- [ ] Mobile receives push — body appears; **Watch** action button visible (Android)
- [ ] Tap Watch → browser opens to the URL
- [ ] Body-tap of notification — also opens URL (when stream_url present)

### 3.6 Voice messages (§ commits a220e7e + 97c1a49)

- [ ] Admin → New Announcement → scroll to **Voice message** section → **Record voice** button
- [ ] Browser prompts for mic permission → allow
- [ ] Record 10-15 seconds → **Stop**
- [ ] **Play** preview works inline
- [ ] **Save voice** — uploads; you should see `/uploads/announcements/<uuid>.webm` on Hostinger disk under UPLOADS_DIR
- [ ] Send the announcement
- [ ] Mobile push arrives with 🎤 prefix in body
- [ ] Open Inbox → announcement card shows a voice player with play button + duration
- [ ] Tap play — audio plays; progress bar advances; tap pause stops it

### 3.7 C2 retry path

Hard to trigger intentionally without breaking Firebase. If you see a `send_failed` row naturally:
- [ ] Open System Health → Send failures section
- [ ] Click **Retry** → toast says success or failed
- [ ] If success, row moves out of failures list

### 3.8 Error boundaries (§ commit 8e9991a)

Best tested by intentionally breaking something, which isn't practical for a smoke test. Just confirm:
- [ ] Admin panel loads without white screen
- [ ] Mobile app loads without white screen

---

## § 4 — Known issues / gotchas

- **iOS:** untested. Most features should work but Android-specific polish (bubbles, MessagingStyle, launchActivity) doesn't apply.
- **Voice message browser support:** Chromium + Firefox are fine. Safari on macOS works but older iOS Safari (<14.5) won't record.
- **Old existing announcements:** rows without `stream_url`/`voice_url` render normally — both columns are nullable.
- **Foreground notifications on mobile:** if the app is open when a push arrives, notifee still builds the notification. This is intentional (same UX as background) but some users find it duplicative.

## § 5 — Rollback plan

If prod breaks badly:

- [ ] Revert the merge commit on `main` — Hostinger redeploys the previous state
- [ ] **Migrations don't auto-revert.** Added columns (`stream_url`, `voice_url`, `voice_duration_ms`) are nullable and untouched by old code — safe to leave. The `sending` and `send_failed` enum values are also safe to keep even on old code (old code simply won't write them).
- [ ] `cron_runs` table can stay — unused by old code.
- [ ] If the issue is specifically the cron atomic-claim, you can manually reset stuck rows: `UPDATE announcements SET status = 'scheduled' WHERE status = 'sending';`

No migration is destructive, so forward-only deploy is safe.

---

## § 6 — What to report back

When you hit issues during testing, I'll need:
- Which check failed (section number above)
- What happened vs. what was expected
- For server-side issues: last ~50 lines of Hostinger Runtime Logs around the failure timestamp
- For mobile: Android version, whether the app was foreground/background/killed when the issue happened

Happy testing.
