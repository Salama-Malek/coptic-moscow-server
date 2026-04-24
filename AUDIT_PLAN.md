# Coptic Moscow — Pre-Launch Audit Plan

Branch: `audit/pre-launch-fixes`
Started: 2026-04-24

Living checklist of every finding from the pre-launch audit. Each item is updated as it's completed. Severity: **P0** blocks launch, **P1** fix before Abouna's daily use, **P2** first month, **P3** flag-and-move.

---

## Status summary

| Phase | P0 | P1 | P2 | Done |
|---|---|---|---|---|
| Critical bugs | 3 | — | — | **3 / 3** (C1, C2 coded; C3 runbook-only) |
| High priority | — | 3 | — | **2 / 3** (H1 + H2 rate-limit shipped; H3 mobile foreground debounce pending) |
| Quick wins | — | — | 3 | **3 / 3** |
| Observability | — | 4 | 3 | **6 / 10** (OB2, OB4, OB5, OB6, OB7, OB8 shipped; OB1/OB3/OB9/OB10 pending) |
| Growth | — | — | — | **G2, G3, G8, voice-notes shipped · G4 blocked on content · G1/G5/G6/G7/G9–G15 tracked** |
| Other | — | — | 5 | 0 / 5 |

---

## P0 — Launch blockers (critical bugs)

### [x] C1 — Scheduled cron can double-send  ✅ shipped
- **Files:** `server/src/routes/cron.ts:14-37`, `server/src/services/fcm.ts:295-303`
- **Repro:** Scheduler ticks `/cron/send-due` at T=0 (handler runs 8s multicast). Scheduler retries at T=5s — same `status='scheduled'` row re-selected, second dispatch starts. Two notifications delivered to every parishioner.
- **Fix plan:**
  1. Migration 002 adds `'sending'` and `'send_failed'` to the announcement status enum.
  2. `cron.ts` atomically transitions `scheduled → sending` per row via `UPDATE ... WHERE id=? AND status='scheduled'`. Only proceeds if `affectedRows=1`.
  3. `fcm.ts::markSent` already sets `status='sent'` — confirmed to work on `sending` rows too.
  4. On FCM failure inside the loop, transition `sending → send_failed` (paired with C2).

### [x] C2 — FCM failure silently marks announcement as "sent"  ✅ shipped
- **File:** `server/src/routes/announcements.ts:131-180`
- **Repro:** Service account creds expire or network blip. Abouna clicks Send. `INSERT` writes `status='sent'`; `sendAnnouncementToAll` throws; catch at line 174 swallows; response is `201 { status: 'sent' }`. Zero devices received.
- **Fix plan:**
  1. Immediate-send path INSERTs with `status='sending'` instead of `'sent'`.
  2. On FCM success → existing `markSent` flips to `'sent'` (no change).
  3. On FCM failure → transition to `'send_failed'`, return `500` with `{ id, status: 'send_failed' }` so admin-web can show a retry banner.
  4. Admin-web History page shows a red "Failed to send — retry" pill for `send_failed` rows. (Follow-up UI work — flagged separately; core fix is backend state correctness.)

### [~] C3 — Production timezone not programmatically verified  ⏳ runbook ready, operator action pending
- **File:** `server/src/routes/cron.ts:15-16` uses `NOW()`.
- **Risk:** If Hostinger Node process starts without `TZ=Europe/Moscow`, and MySQL `@@session.time_zone` is not `+03:00`, scheduled announcements fire 3h late (or early, depending on which clock is UTC).
- **Fix plan:** This is a production verification task, not a code fix. Runbook added at bottom of this doc (§ Prod TZ runbook). Run on the live host before launch.
- **Longer-term option** (P2): store `scheduled_for_utc` as UTC and compare against `UTC_TIMESTAMP()` — removes env-var dependency. Deferred; not a launch blocker once runbook passes.

---

## P1 — High priority

### [x] H1 — JWT has no revocation path  ✅ shipped
- **File:** `server/src/lib/jwt.ts`, `server/src/middleware/authJwt.ts` (or wherever `requireAuth` lives)
- **Observation:** Disabled admins retain valid tokens up to 7 days. `active` flag only checked at login.
- **Fix:** In `requireAuth` middleware, after JWT verify, query `SELECT active FROM admins WHERE id=?` and reject if `0`. One indexed lookup per admin request; admin traffic <1 QPS.

### [~] H2 — Missing role checks + rate limits on admin endpoints  ⏳ rate limits shipped; role-check decision pending
- **Files:** `server/src/routes/announcements.ts:126` (POST /admin), `server/src/routes/admin.ts:288` (GET /stats), `server/src/routes/admin.ts:124` (POST /me/password)
- **Observation:** Any authenticated admin (including non-super) can send to all 500 devices. `/me/password` is unrate-limited. Stats endpoint exposes device counts to all admins.
- **Fix plan:**
  - Rate-limit `/me/password` via existing `loginLimiter`-style middleware (30 req / 15 min).
  - Rate-limit `POST /announcements/admin` (30 req / 15 min).
  - **Decision needed from user:** Should regular admins (role=`admin`) be able to send announcements, or only super-admins? Defaulting to "keep current behavior" unless told otherwise — just add the rate limit for now.
  - **Decision needed:** Should stats be super-admin-only? Defaulting to scope-everyone-sees-all-counts (current) but doc the trade-off.

### [ ] H3 — Mobile foreground sync has overlapping refetch triggers
- **Files:** `mobile/src/screens/HomeScreen.tsx`, `InboxScreen.tsx`, `CalendarScreen.tsx` (uses `useFocusEffect` + `setInterval` + `AppState`)
- **Observation:** On app resume, all three paths fire within ~1s → 3× requests. At scale this is 30k+ unnecessary reads/day on shared Hostinger.
- **Fix:** Single `useSyncOnForeground()` hook that debounces via an AsyncStorage `lastFetchedAt` cache (skip if <15s). Pull-to-refresh bypasses.

---

## P2 — Quick wins (< 4h each)

### [x] QW1 — Rate-limit `/api/admin/me/password`
- **File:** `server/src/routes/admin.ts:124`
- **Fix:** Add the same `loginLimiter` wrapper as login.
- **Effort:** 20 min.

### [x] QW2 — `.max()` bounds on unbounded Zod string fields
- **Files:** `server/src/routes/admin.ts` (login, changePassword), `server/src/routes/templates.ts` (body_*_template, render values), `server/src/routes/snippets.ts` (value_*), `server/src/routes/announcements.ts` (body_* on update schema)
- **Fix:** Add `.max(128)` on passwords, `.max(4000)` on bodies/templates, `.max(500)` on snippet values.
- **Effort:** 45 min.
- **Why:** Unbounded bcrypt input is a DoS (can send 10 MB password and pin a CPU core).

### [x] QW3 — ISO-validate `calendar.since` query param
- **File:** `server/src/routes/calendar.ts:14` (`publicQuerySchema`)
- **Fix:** `z.string().datetime({ offset: true }).optional()` instead of raw `z.string().optional()`.
- **Effort:** 10 min.

---

## Observability & ops

Today's baseline (what exists):
- Health check at `GET /api/health` — returns `{status:'ok'}` unconditionally. Does **not** check DB, Firebase init, or disk. A "healthy" response means nothing right now.
- Global `unhandledRejection` + `uncaughtException` handlers in `server/src/index.ts:22-36` — good for post-mortem, but only visible in Hostinger's Runtime Logs tab.
- `admin_audit_log` table — every mutation is logged with admin id, action, target, IP. Well-covered.
- `send_log` table — per-announcement sent/failed counts. Exists but no dashboard queries it.
- Per-route `console.error` + `console.log`. Unstructured; no request IDs; no timing.
- No Sentry, no pino/winston, no metrics, no uptime monitor, no Express error-handler, no React error boundary.

### [ ] OB1 — External uptime monitoring  `P1  effort: S (30 min, no code)`
Hostinger's runtime logs don't alert. If the Node process crashes and restart fails, nobody knows until Abouna tries to send a notification and it fails silently.
- **Fix:** Sign up for UptimeRobot free tier, add HTTPS check on `https://coptic-notify.sm4tech.com/api/health` at 5-min interval, SMS/email alert on 2-fail. Also add a ping on `/admin/` (verifies static serving works).
- Zero code change. Just the operator setting up the account.

### [x] OB2 — Health check should actually check  `P1  effort: S`  ✅ shipped
- **Current:** `GET /api/health` returns `{status:'ok', timestamp}` with no checks.
- **Fix:** Add `SELECT 1` DB probe (200ms timeout) + Firebase init flag + disk space on admin-web dist. Return `503` if any fail. This is what UptimeRobot watches.

### [ ] OB3 — Sentry on all three surfaces  `P1  effort: M (3-4h one-time)`
Without this, post-launch bugs are invisible. Abouna won't report "the app showed a white screen once" — but that's the signal that matters.
- **Server:** `@sentry/node` in `index.ts` before route registration; Express error-handler with `Sentry.Handlers.errorHandler`. Capture in `cron.ts` and `fcm.ts` catches.
- **Mobile:** `@sentry/react-native` with source maps uploaded via EAS; wrap App in `Sentry.ErrorBoundary`.
- **Admin-web:** `@sentry/react` with `ErrorBoundary` at `<App />`.
- All three use the same DSN from env var; tag events with `service=server|mobile|admin` and `release=package.json#version`.
- **Free tier covers 5k events/month** — parish scale is nowhere near that.

### [x] OB4 — Structured request logging with pino-http  `P2  effort: S`  ✅ shipped
- **Current:** no request log at all. Can't tell which admin action triggered a 500.
- **Fix:** `pino-http` with JSON output, request id propagated to audit log, redact Authorization header. Writes to stdout — Hostinger captures it.

### [x] OB5 — Express error-handling middleware  `P1  effort: S`  ✅ shipped
- **Current:** every route has its own `try/catch` + generic 500. Errors swallowed with a `console.error`.
- **Fix:** Centralize. `app.use((err, req, res, next) => { logger.error({err, reqId}); Sentry.captureException(err); res.status(500).json(...) })`. Reduces per-route boilerplate; single place to reshape error responses.

### [x] OB6 — React Error Boundary on admin-web and mobile  `P1  effort: S`  ✅ shipped
- **Current:** neither client has one. Any unhandled render error = white screen with no diagnostic.
- **Fix:** `<ErrorBoundary>` at the App root in both clients. Shows localized "Something went wrong — reload" and fires Sentry. Essential for Abouna's trust.

### [x] OB7 — Admin panel "System health" page  `P2  effort: M`  ✅ shipped
Turn `send_log` + `admin_audit_log` + cron run records into a dashboard Abouna actually sees. Suggested tiles:
- Active devices (7d / 30d trend sparkline)
- Notifications delivered today / this week (from `send_log`)
- Last cron run timestamp + result for `send-due` and `cleanup-tokens`
- Recent `send_failed` announcements with a **Retry** button (uses H2's retry banner)
- Last 10 audit log entries (who did what when)
- Firebase init status, DB connection status, disk free on Hostinger

### [x] OB8 — Cron run history table  `P2  effort: S`  ✅ shipped
- **Current:** cron logs go to stdout only. No retrospective visibility.
- **Fix:** `cron_runs` table — `id, job, started_at, ended_at, result_json, error`. Both cron routes write a row on entry + exit. Powers OB7 dashboard + helps diagnose "why did today's scheduled announcement not fire."

### [ ] OB9 — FCM delivery alerting  `P2  effort: S (2h)`
When an announcement has `sent_count=0` + `failed_count>0`, that's an operator-actionable event (service account expired, Firebase quota, etc.). Send an email/Telegram ping to super_admin. Parish-scale rate is maybe 1 announcement/day — email is fine, no PagerDuty needed.

### [ ] OB10 — Mobile FCM token metrics  `P3  effort: S`
Already have device_tokens + last_seen. Add admin-panel view: registered vs active (heartbeat <7d) over time, breakdown by language. Helps Abouna understand reach without guessing.

---

## P2 — Other (flagged, not expanded yet)

### [ ] O1 — FCM message has no dedupe key
- If C1 regresses (or a manual retry happens for a different reason), notifee uses `id: p.id` which only replaces on the same device *if still visible*. Cross-device or dismissed → two notifications.
- **Fix idea:** Add a `send_attempt_id` UUID column on announcements set on each send; pass as the notifee notification `id`. Two attempts = two UUIDs = but we'd WANT the second to replace the first. So actually keep `id: p.id` (current) and rely on C1's idempotency instead. **Decision:** no code change, C1 is the real fix.

### [ ] O2 — Dynamic `SET ${fields.join(', ')}` in 4 update routes
- Safe today (hardcoded whitelist), fragile to future column additions. **Fix later** via a small typed update-builder helper.

### [ ] O3 — `GET /admin` announcements uses `parseInt` not Zod
- File: `server/src/routes/announcements.ts:70-71`
- Use the `validate()` middleware pattern for consistency.

### [ ] O4 — CORS `origin: '*'` on public routes
- File: `server/src/index.ts:49-51`
- Low risk (stateless JWT, no cookies), but tightening to explicit origins is good hygiene.

### [ ] O5 — FCM multicast has no per-batch retry on network error
- File: `server/src/services/fcm.ts:180-227`
- On transient network error mid-batch, the whole 500-token chunk is lost for that announcement.
- **Fix idea:** Wrap `sendEachForMulticast` in a 3× retry with exponential backoff.

---

## Super-app growth opportunities

Scored on: **Value 1-5** (how much it drives daily use + trust + retention) · **Effort S/M/L/XL** · **Fit 1-5** (how Coptic-Moscow-audience-specific it is — diaspora, multilingual, clergy-led) · **Strategic 1-5** (toward multi-parish SaaS).

### Tier 1 — habit-forming daily features

These turn the app from "open when a push lands" into "open every morning." This is the category-leading wedge.

#### [ ] G1 — Agpeya (Coptic Book of Hours) `value: 5 · effort: L · fit: 5 · strategic: 5`
- **What:** The seven canonical hours (Prime/Terce/Sext/None/Vespers/Compline/Midnight) with full psalm + prayer text in AR/RU/EN. Audio recitation in Arabic with follow-along highlighting. Suggested-hour push at sunrise/noon/sunset.
- **Why it fits:** The single most-used prayer book in Coptic laity. Currently parishioners flip PDF copies or use English-only Android apps. Shipping this in Russian is a genuine first in the diaspora.
- **Key decisions:** Text sourcing (St Macarius Monastery publishes CC-licensed translations; Russian translations by Fr Sergei Timashev exist). Audio: licensed or crowd-recorded by Abouna.
- **Why L not M:** the content pipeline (copyright clearance, AR/RU/EN alignment, audio sync if pursued) is most of the work. The UI is straightforward.

#### [x] G2 — Fasting calendar with daily meal guidance `value: 5 · effort: S · fit: 5 · strategic: 5`  ✅ v1 shipped (meal guidance deferred)
- **What:** Every day marked with its fasting type (Strict / Wine+Oil / Fish Allowed / Non-fast). Tap a day → what's permitted + common Coptic breakfast/lunch/dinner ideas. Ramadan-style daily tile on Home.
- **Why it fits:** Coptic church fasts >210 days/year. Diaspora parishioners constantly Google "is today a fast?" No single reliable source in Russian.
- **Why S:** Content is static, rule-based (movable + fixed feasts). Data ships bundled in the app; zero server dependency. Calculation engine is public-domain.

#### [x] G3 — Live-stream liturgy + "Tap to watch" push `value: 5 · effort: S · fit: 5 · strategic: 3`  ✅ shipped
- **What:** Sunday Liturgy live-stream URL embedded in the scheduled-announcement push. Tap notification → opens YouTube / VK Live in the video player. Bonus: in-app PiP player that follows you across screens.
- **Why it fits:** Russia has a huge "cannot attend physical liturgy" population (elderly, distant city, travel). Diaspora already attends virtually. Currently they hunt for the YouTube link in a WhatsApp group every week.
- **Why S:** Deep-link URL extension on the announcements schema; notifee already supports action buttons. A channel-ID setting in System/Settings. ~2 days.

#### [!] G4 — Saint of the day (Synaxarium) `value: 4 · effort: M · fit: 5 · strategic: 4`  ⏸ **BLOCKED on content decision**
- **What:** Home-screen tile: today's Coptic saint(s), icon, 2-paragraph hagiography in AR/RU/EN. Tap → full reading.
- **Why it fits:** Copts commemorate saints daily; the Synaxarium is read aloud at dawn. An app tile is the modern equivalent.
- **Why M:** Synaxarium text exists in Arabic (public domain) and English (CC-licensed); Russian translation is partial and will need compilation work.
- **Why blocked not shipped:** the infrastructure (Coptic date converter, lookup table schema, tile component) is ~1 day of work — cheap. But shipping it without real Synaxarium content is worse than not shipping: it builds UX debt (placeholder text, "no saint today" on 340/365 days) and conditions users to expect a feature that's actually empty. **Decision you need to make before I build:** (a) which translation source — St Macarius Monastery (AR + partial EN), Fr Tadros Malaty's works, Archangel Michael Coptic Orthodox publications? (b) do we ship AR-only v1 and add RU/EN later? (c) admin-panel CMS for Abouna to add entries himself over time, vs shipped-as-static-data? Flag me with answers and I'll build it.

### Tier 2 — weekly/occasional features

Drive retention, strengthen community ties. Build after Tier 1 lands.

#### [ ] G5 — Audio homilies (Abouna's sermons) `value: 4 · effort: M · fit: 5 · strategic: 4`
- **What:** Abouna uploads recorded sermon → auto-transcoded to mp3 → appears in Inbox. Background playback, resume-where-you-left-off, 1.25× / 1.5× speed.
- **Why it fits:** Diaspora cannot attend Arabic sermons; recordings are gold. Currently Abouna messages mp3 files in Telegram; they vanish in the scrollback.
- **Why M:** Storage (Backblaze B2 / Cloudflare R2 free tier fits easily), audio player UI, admin upload form. Transcoding via ffmpeg-on-demand or at upload time.
- **Open question:** Offline download vs stream-only. Offline is a bigger engineering lift but critical for Moscow metro / diaspora on patchy wifi.

#### [~] G6 — Group messaging  `value: 4 · effort: M · fit: 5 · strategic: 5`  ⏳ broadcast subgroup pending; voice message shipped as bonus
- **What:** Abouna picks which group(s) receive an announcement. Users opt into groups in Settings. Groups stored as JSON array on device_tokens — extends existing `preferences` pattern.
- **Why it fits:** Abouna currently has 4 WhatsApp groups + the app. Group-targeted push reduces notification fatigue and gives each subgroup its own signal-to-noise.
- **Why M:** Schema extension (`groups` column or JSON), admin-web multi-select, mobile group management in Settings, FCM query changes. Reasonably clean since the data model already supports it.

#### [ ] G7 — Confession booking `value: 4 · effort: M · fit: 5 · strategic: 4`
- **What:** Abouna defines weekly availability slots → parishioners pick a 15-min slot. Calendar integration, reminder push 30 min before.
- **Why it fits:** Confession is sacrament, not a casual ping. Structured booking removes phone-call friction — especially for young/shy parishioners.
- **Why M:** Booking state machine, calendar clash detection, privacy (only the parishioner and Abouna see the booking, not "all admins"). Needs thought on cancellation policy.

#### [x] G8 — Commemorations (40-day + 1-year memorials) `value: 3 · effort: S · fit: 5 · strategic: 3`  ✅ shipped
- **What:** Abouna logs a reposed member; app auto-schedules reminder pushes at 40 days and 1 year for family + parish.
- **Why it fits:** Deeply Coptic custom; currently on Abouna's paper calendar. Small feature, outsize pastoral value.
- **Why S:** `commemorations` table, reuse the existing scheduled-announcement infrastructure. Could literally be a specialized template.

#### [ ] G9 — Event RSVPs with capacity `value: 3 · effort: M · fit: 4 · strategic: 3`
- **What:** Parish dinners, youth retreats, vespers dinners. Attach RSVP + capacity limit to a calendar_event.
- **Why it fits:** Moscow parish has recurring dinners; currently capacity is tracked in a Google Sheet.
- **Why M:** Extends calendar_events, adds rsvps table, admin panel for guest list. Medium-complexity UI.

### Tier 3 — operator features (for Abouna's workflow)

These don't drive parishioner retention but save Abouna hours per week. Makes the product stickier from the clergy side.

#### [ ] G10 — Baptism / wedding / funeral records archive `value: 3 · effort: M · fit: 4 · strategic: 4`
- **What:** Digital parish register — searchable record book of baptisms, weddings, chrismations, funerals. Matches the legal paper-book Orthodox priests must maintain.
- **Why it fits:** Every Orthodox parish already does this on paper. Digital copy is legal in Russia if print-on-demand; strongly desired by young clergy.
- **Why M:** Records schema, generate PDF with parish seal, search/filter, audit log for every view. Privacy-heavy.

#### [ ] G11 — Parish directory (opt-in) `value: 3 · effort: M · fit: 4 · strategic: 4`
- **What:** Members opt to appear with name/photo/family-status. Contact via in-app message only (no phone scrape). Abouna moderates.
- **Why it fits:** Diaspora community cohesion. Harder in Russia (152-FZ personal-data law implications — needs consent flow).
- **Why M:** Profile schema, moderation queue, privacy controls, 152-FZ compliance check.

#### [ ] G12 — Donation flow `value: 4 · effort: L · fit: 5 · strategic: 5`
- **What:** One-tap tithing. Russia-internal: YooKassa or CloudPayments (Stripe is restricted). Diaspora: Stripe. Recurring subscriptions, admin CSV export for parish accounting.
- **Why it fits:** Diaspora giving is significant; current channel is "Telegram me for our SberBank IBAN." Friction = lost revenue.
- **Why L:** Payment compliance (PCI-adjacent even if tokenized), receipt flow, multi-currency, tax handling. Non-trivial legal review before live.

### Tier 4 — platform plays (future)

These unlock multi-parish SaaS or iOS parity. Don't pursue until at least 1 other parish asks.

#### [ ] G13 — Multi-parish tenant mode `strategic: 5`
Add `parish_id` scoping to every table, an invite flow, subdomain routing. The architecture is already 80% there (single-Firebase-project pattern, role-based admin). Would make this a Russian-Coptic-diaspora SaaS with zero new core UX.

#### [ ] G14 — iOS parity `strategic: 4`
EAS can already produce iOS builds. Blockers: $99/yr developer account, APNs certificate management, Apple review cycle. Notifee bubble feature is Android-only — iOS gets MessagingStyle via APNs. Deferred until Android user base demands it.

#### [ ] G15 — Open Coptic Church Calendar API `strategic: 5`
Expose G2 (fasting calendar) + G4 (saint of the day) as a public JSON API. Other Coptic apps/sites consume it, cementing this project as the calendar source-of-truth. Network-effect play.

### Nice-to-have (track but don't pursue unless asked)

- **G16 — Iconography library with explanations** (value 2, effort M) — educational, not habit-forming. Better as a web blog than an app feature.
- **G17 — Notifications digest** (value 2, effort S) — weekly summary push for users who want less noise. Low pull, but cheap and may reduce uninstalls.
- **G18 — Offline prayer library** (value 4, effort S) — overlaps heavily with G1 Agpeya and can ship as a subset.
- **G19 — Multilingual bulletin board** (value 3, effort S) — largely duplicates announcements feature. Skip.

### Recommended build order

If I were shipping this commercially, the order would be:

1. **G2 Fasting calendar** (1-2 weeks, instant daily utility) — fastest path to daily opens
2. **G3 Live-stream + tap-to-watch push** (days, high-perceived-value, uses existing infra)
3. **G1 Agpeya** (4-6 weeks, the defining feature) — start text sourcing now, ship incrementally per-hour
4. **G4 Saint of the day** (2 weeks) — ships alongside G1 since both need Synaxarium text pipeline
5. **G6 Group messaging** (1-2 weeks, low-cost high-engagement)
6. **G8 Commemorations** (days, high pastoral value)
7. **G5 Audio homilies** (2-3 weeks, needs storage decision first)
8. **G7 Confession booking** (1-2 weeks, high-touch — get Abouna's feedback on slot model first)
9. **G12 Donations** (3-4 weeks + legal review)
10. **G13 Multi-parish** — only when a second parish asks

**Bundle strategy:** Tier 1 (G1-G4) shipped together is the "1.0" release that justifies App Store visibility. Anything before that is incremental polish on the notification tool.

### Decision points for you

Before I can implement anything, I need you to pick:

1. **Which feature(s) to pursue in what order.** My pick: G2 first (cheapest, fastest user-visible win), then G3 (days of work), then start G1's content pipeline.
2. **G1 Agpeya content source.** Do you have access to a specific translation you want to use (St Macarius? another)? This decides licensing and months of future work.
3. **G5 storage** if we do audio. Backblaze B2 ($6/TB/month, S3-compatible, no egress fees) vs Hostinger disk (limited) vs Cloudflare R2 (free egress, slightly more setup).
4. **G12 payments** — Russia (YooKassa / CloudPayments / Tinkoff) vs diaspora (Stripe) vs both.
5. **Anything missing from this list** that you specifically want.

---

## Sanity-check results (recon pass)

Recent work holds up — no regressions found:
- FCM pipeline: clean, no double-listeners, no leftover `expo-notifications` FCM path
- Timezone: all `toLocale*` calls route through `lib/datetime.ts` in both clients ✓
- Admin polling: `useApiGet` + `notifyDataChanged` + visibility refetch — working
- Mobile foreground sync: three triggers present (see H3) — the *correctness* is fine, the *load* is not
- Edit/delete-after-send + fetch-fresh-on-edit: 404 handling in place
- Route fixes (`/admin/calendar` → `/calendar/admin`, `/admin/announcements` → `/announcements/admin`): confirmed fixed across all 28 admin-web calls + 5 mobile calls

Tooling:
- `tsc --noEmit` clean on all three packages
- i18n key parity: mobile 28/28/28, admin-web 75/75/75
- Zero `TODO/FIXME/HACK`, zero stray hardcoded hex in migrated surfaces

---

## § Prod TZ runbook (C3)

Run this on the live Hostinger host before launch. Pass = all three match Moscow time.

**1. Check Node process tz:**
```bash
# SSH into Hostinger, attach to the running Node process env
printenv TZ
# Expected: Europe/Moscow
```

**2. Check MySQL session tz:**
```sql
SELECT @@global.time_zone AS global_tz,
       @@session.time_zone AS session_tz,
       NOW() AS mysql_now,
       UTC_TIMESTAMP() AS utc_now;
-- Expected: session_tz is '+03:00' or 'Europe/Moscow',
--          mysql_now is 3h ahead of utc_now.
```

**3. Check against a real scheduled row:**
```sql
SELECT id, status, scheduled_for, NOW() AS mysql_now,
       (scheduled_for <= NOW()) AS would_fire_now
FROM announcements
WHERE status = 'scheduled'
ORDER BY scheduled_for ASC
LIMIT 5;
```

**If any of these are wrong:**
- Set `TZ=Europe/Moscow` in Hostinger's Node.js env vars panel, restart Node.
- In MySQL: `SET GLOBAL time_zone = '+03:00';` (requires SUPER privilege; on shared hosting may need ticket).
- Fallback: convert stored `scheduled_for` to UTC at write time, compare against `UTC_TIMESTAMP()` at read time — deferred refactor, not needed if TZ is set correctly.

---

## Work log

- **2026-04-24** — Branch created, plan written, ready to start C1+C2 (shared migration 002).
- **2026-04-24** — **First batch shipped**:
  - C1: atomic `scheduled → sending` claim in `cron.ts`; `sending → send_failed` on FCM error. No more double-sends on overlapping cron runs.
  - C2: immediate-send path in `announcements.ts` now inserts `'sending'`, flips to `'sent'` via `markSent` on success or `'send_failed'` on FCM exception. Response carries the final status so admin-web can react.
  - Migration `002_announcement_status_states.sql` adds `'sending'` and `'send_failed'` enum values.
  - i18n: `ann_sending` + `ann_send_failed` added to AR/RU/EN (parity preserved 77/77/77).
  - QW1: `sensitiveActionLimiter` (30 req / 15 min, admin-id keyed) applied to `/api/admin/me/password` and `/api/announcements/admin`.
  - QW2: `.max()` bounds on passwords (128), titles (200), bodies (4000), templates (4000), snippets (500), render values (2000), placeholder arrays (50).
  - QW3: `calendar.since` now ISO-datetime validated; `starts_at` also ISO-validated; description fields capped at 4000; duration/reminder minutes bounded.
  - All three tsc checks remain clean.
- **2026-04-24** — **Observability launch-floor batch shipped**:
  - OB2: `GET /api/health` now probes DB (`SELECT 1` with 1.5s timeout) and Firebase init state. Returns `503` when DB is down — what UptimeRobot actually needs to watch. New route file `server/src/routes/health.ts`; `isFirebaseInitialized()` exported from `services/fcm.ts`.
  - OB4: `pino` + `pino-http` wired. Structured JSON lines in prod, pretty-printed in dev. `x-request-id` generated per request (echoed back in response header and included in error responses so admins can quote it). Auth, cron-secret, and password fields redacted via logger config. Health probes silenced from request log to avoid UptimeRobot noise.
  - OB5: `express-async-errors` imported at the top of `index.ts`; `errorHandler` + `notFoundHandler` middleware added after all routes. Any route that throws async now lands in the centralized handler with request-id propagation. Existing per-route try/catch still works unchanged; this is a safety net.
  - OB6: `ErrorBoundary` on both clients. Admin-web uses `withTranslation()` HOC + locale keys. Mobile uses `i18n.t()` directly + hardcoded theme values (documented: must render even if ThemeProvider itself crashed). Locale parity preserved: admin-web 80/80/80, mobile 31/31/31.
  - OB8: Migration `003_cron_runs.sql` adds history table; `recordCronRun()` helper wraps each cron handler — writes a 'running' row on entry and flips to 'ok'/'error' with duration + result JSON on exit. Cron.ts now uses structured logger throughout.
  - Server deps added: `pino`, `pino-http`, `express-async-errors`, `pino-pretty` (dev).
  - `tsc --noEmit` clean on server + admin-web + mobile.
  - **Deferred (need user action):** OB1 (UptimeRobot account), OB3 (Sentry DSN), OB7 (half-day admin dashboard), OB9 (needs SMTP transport decision).
- **2026-04-24** — **OB7 System Health page shipped**:
  - New `GET /api/admin/system/overview` route — single endpoint returns DB/Firebase status, cron runs (last 5 per job), device stats (total / 1d / 7d / per-language), delivery stats (1d/7d sent + failed from send_log), recent send_failed announcements, and last 15 audit log entries. Gated `requireAuth + requireSuperAdmin`.
  - New `POST /api/announcements/admin/:id/retry` — atomically transitions `send_failed → sending`, re-dispatches via FCM, flips to `sent` or `send_failed` on result. Protected by `sensitiveActionLimiter`. Returns `409 INVALID_STATE` if called on a row not in `send_failed`.
  - New admin-web page `pages/SystemHealth.tsx` — polls overview every 30s, renders tiles for every data source. Retry button on failed rows wired to the new endpoint with toast feedback + `notifyDataChanged()` broadcast.
  - Nav link `/admin/system` added to Layout, super-admin only.
  - Locale keys `sys_*` + `nav_system_health` added to all three admin-web locales (parity preserved, new total 113/113/113).
  - Bundle impact: +19 KB raw / +6 KB gzipped. Clean `tsc --noEmit` + successful `vite build`.
  - Closes the loop on C2 — Abouna now has a visible retry path for silent-FCM-failure rows.
- **2026-04-24** — **G2 Fasting calendar v1 shipped**:
  - Pure calc engine at `mobile/src/lib/fasting.ts` — Orthodox Pascha via Meeus Julian-Paschalion formula (+13 days Julian→Gregorian offset for 21st century), sanity-checked against 2025/2026 Pascha dates. All major Coptic fast periods implemented: Great Lent + Holy Week, Jonah/Nineveh Fast, Apostles' Fast, Dormition Fast (Aug 7-21), Nativity Fast (Nov 25 - Jan 6), weekly Wed/Fri, Pentecost period exemption, major-feast overrides (Nativity, Theophany, Annunciation, Palm Sunday, Pascha, Bright Week, Ascension, Pentecost, Transfiguration, Dormition, Nayrouz, Cross, Presentation).
  - Four fast types: `strict` / `wine_oil` / `fish` / `none`. Sat/Sun during Great Lent relaxed to `wine_oil`.
  - `mobile/src/screens/FastingScreen.tsx` — today tile, month grid with color-coded dots, weekday labels respecting locale (AR/RU/EN), prev/next month navigation, tap-to-select detail, legend.
  - `mobile/src/components/FastingTile.tsx` — Home screen tile with today's status + chevron, navigates to full screen.
  - Navigation: added `@react-navigation/native-stack`, created `RootNavigator` wrapping `TabNavigator` + `FastingScreen`. Updated linking config — deep-link path `copticmoscow://fasting` now routes correctly alongside existing tab deep-links.
  - i18n: 33 new keys (fast_type_*, fast_period_*, feast_*, fasting_*) in all three locales. Parity 64/64/64.
  - `tsc --noEmit` clean on mobile (via verify config) + server + admin-web unaffected.
  - **Next for G2 (deferred):** meal guidance tiles per day (what's allowed today), admin override for Abouna to mark specific parish-level adjustments, background push "Today is a fasting day" at sunrise for opted-in users.
- **2026-04-24** — **G3 Live-stream + Tap-to-Watch push shipped**:
  - Migration `004_announcement_stream_url.sql` adds nullable `stream_url VARCHAR(500)` to `announcements`. Non-destructive, auto-applies on next server start.
  - Server: `createAnnouncementSchema` + `updateAnnouncementSchema` accept `stream_url: z.string().url().max(500).optional().nullable()`. INSERT / UPDATE column-map / all SELECT statements in `announcements.ts` and `fcm.ts` carry the field end-to-end. Retry endpoint works with no change (re-fetches from DB, URL flows through).
  - FCM payload: `stream_url` included in data object when present; omitted entirely when null (so the mobile handler can rely on `typeof data.stream_url === 'string'`).
  - Mobile: `displayAnnouncement()` now takes optional `streamUrl`. When set, notifee renders the notification with a localized "Watch" action button (AR / RU / EN via i18n) and propagates the URL in the notification's data.
  - Mobile: `notifee.onBackgroundEvent` registered at module scope in `notifications.ts`; `registerNotifeeForegroundHandler()` wired from App.tsx's effect. Both route `ACTION_PRESS id='watch'` + body-press-with-stream-URL to `Linking.openURL()`.
  - Admin-web: `NewAnnouncement` form + `EditAnnouncementModal` both get an optional Live-stream URL input with Video icon, helper text, and URL placeholder. Field reflects existing URL when editing, preserved through retry flow.
  - i18n: `notif_watch_action` added to mobile (AR/RU/EN, parity 65/65/65). `ann_stream_url` + `ann_stream_url_placeholder` + `ann_stream_url_hint` added to admin-web (parity 126/126/126).
  - Verified: `tsc --noEmit` clean on server + admin-web + mobile. Vite build passes; bundle +0.6 KB gzipped.
  - Makes it a 2-minute Saturday ritual for Abouna: paste the Sunday live-stream URL into the scheduled-announcement, parishioners get a Watch button on Sunday morning.
- **2026-04-24** — **Voice-message-on-announcement shipped** (decided after product review; see G6 note):
  - User flagged the broadcast-group variant of G6 in favor of WhatsApp-style voice notes — pastor-to-parish voice is the higher-leverage feature for an Arabic-speaking clergy-led audience than targeted broadcasts to subgroups. Original G6 broadcast variant deferred (still tracked).
  - Migration `005_announcement_voice.sql` adds nullable `voice_url VARCHAR(500)` + `voice_duration_ms INT` columns.
  - Server: new route `POST /api/admin/announcements/voice` (multer disk storage, 2 MB cap, whitelisted MIME, UUID filenames). `UPLOADS_DIR` env configurable (defaults to `./uploads` in dev; **must be set outside the repo in prod** or auto-deploy wipes files). Files served via `express.static` with 30-day immutable cache. `PUBLIC_BASE_URL` env makes returned URLs absolute so mobile can consume them directly. Zod schemas + INSERT / UPDATE col-map / SELECT lists / FCM payload all threaded end-to-end.
  - Admin-web: new `VoiceRecorder.tsx` component using the browser `MediaRecorder` API — record / preview / re-record / upload, with inline playback + 2-minute hard cap + graceful mic-denied handling. Wired into both `NewAnnouncement` and `EditAnnouncementModal` alongside the Live-stream URL field.
  - Mobile: new `VoicePlayer.tsx` using `expo-av`, rendered inline inside `AnnouncementCard` whenever `voice_url` is present — play/pause, progress bar, duration readout, auto-unload on unmount. Announcements without voice are unchanged.
  - Push notifications: body prefixed with 🎤 when voice is attached so the lock-screen preview signals "tap to hear Abouna" at a glance.
  - i18n: 12 new keys (voice_* recorder strings) across AR/RU/EN admin-web. Parity 138/138/138. Mobile player has no locale strings (duration-only UI).
  - **Prod deploy note:** set `UPLOADS_DIR=/home/<hostinger-user>/uploads` + `PUBLIC_BASE_URL=https://coptic-notify.sm4tech.com` in Hostinger env; create the uploads directory once (`mkdir -p ~/uploads/announcements`).
  - `tsc --noEmit` clean on all three. Vite build clean. Bundle +2.76 KB gzipped.
- **2026-04-24** — **H1 + G8 + fasting tests shipped** (session wrap-up batch):
  - **H1 JWT revocation** — `requireAuth` middleware now queries `SELECT active FROM admins WHERE id=?` on every authed request. Disabled admins are rejected immediately regardless of token expiry. Fail-closed on DB error (returns 503 rather than letting a potentially-disabled admin through). Closes the biggest remaining P1 security gap; admin traffic <1 QPS so perf cost is negligible.
  - **G8 Commemorations** — Migration 006 adds `commemorations` table (name AR/RU/EN, date_of_repose, notes, linked announcement IDs). New route `POST /api/admin/commemorations` inserts the row + auto-creates two scheduled announcements (40-day and 1-year, 09:00 Moscow) using pre-filled AR/RU/EN memorial text. If the 40d date is already past, it's saved as draft instead of scheduled. Delete cascades to cancel pending announcements. New admin-web page at `/admin/commemorations` (super-admin only). 13 new locale keys across AR/RU/EN. Parity 151/151/151.
  - **Fasting unit tests** — 26 golden-day tests at `mobile/src/lib/fasting.test.ts`: Pascha calc for 2024/2025/2026, each fast period boundary (Jonah, Great Lent, Holy Week, Pentecost, Apostles, Dormition, Nativity), each feast override (Nativity, Theophany, Transfiguration, Dormition, Nayrouz, Cross), weekly Wed/Fri, and ordinary-day fallbacks. All 26 pass. Run with `cd mobile && npm run test:fasting`. Uses Node's built-in `node:test` + `tsx`, no jest needed.
  - **G4 Saint of the day FLAGGED as blocked** — infrastructure is cheap but content is the hard part; shipping without real Synaxarium text would be UX debt. Needs user decision on translation source + scope (AR-only v1? CMS for Abouna?).
  - `tsc --noEmit` clean across all three packages. Vite build clean; bundle +2 KB gzipped. Fasting test suite passes 26/26.
