# Architecture Overview

## System Diagram

```
  +------------------+        +------------------+
  |   Mobile App     |        |   Admin Panel    |
  |  (React Native)  |        |  (React + Vite)  |
  |  iOS / Android   |        |  served at /admin|
  +--------+---------+        +--------+---------+
           |                           |
           | HTTPS                     | HTTPS
           |                           |
  +--------+---------------------------+---------+
  |             Node.js + Express API            |
  |            (coptic-api.sm4tech.com)           |
  +--------+---------+---------+---------+-------+
           |         |         |         |
      /api/devices   |    /api/admin/*   |
      /api/calendar  |    /api/cron/*    |
      /api/announce  |                   |
           |         |                   |
  +--------+---------+    +-------------+--------+
  |     MySQL 8      |    | Firebase Admin SDK    |
  |   (Hostinger)    |    |   (Cloud Messaging)   |
  +-------------------+    +-----------------------+
```

## Components

### Mobile App (`/mobile`)
- **Stack:** React Native + Expo (managed workflow, dev client)
- **Languages:** Arabic (RTL), Russian, English
- **Notifications:** expo-notifications for local scheduling + FCM for push
- **Offline:** AsyncStorage caches calendar + inbox; RRULE expansion runs locally
- **No user accounts** — installs and receives notifications immediately

### Backend (`/server`)
- **Stack:** Node.js 20+, Express, TypeScript strict mode
- **Database:** MySQL 8 via mysql2/promise with connection pooling
- **Auth:** JWT + bcrypt for admin-only endpoints
- **FCM:** firebase-admin SDK, sends per-language batches
- **Cron:** Two endpoints (send-due every 5 min, cleanup-tokens daily) triggered by Hostinger cron

### Admin Panel (`/server/admin-web`)
- **Stack:** React + Vite, served as static files by Express at `/admin`
- **Routing:** BrowserRouter with Express catch-all for SPA
- **Features:** Template-based announcement composer with live preview, calendar RRULE builder, team management

## Data Flow

1. **Parishioner installs app** → app gets FCM token → registers with `/api/devices/register`
2. **Admin creates announcement** → fills template → hits "Send" → POST `/api/admin/announcements`
3. **Server sends FCM** → groups tokens by language → sends localized push per group → logs to `send_log`
4. **App receives push** → shows on lock screen → user opens app → inbox syncs from `/api/announcements`
5. **Calendar sync** → app fetches events → expands RRULE locally → schedules local notification reminders

## Database Tables

| Table | Purpose |
|---|---|
| `admins` | Admin accounts with roles and passwords |
| `device_tokens` | FCM tokens + language + notification preferences |
| `announcements` | All announcements (draft/scheduled/sent/cancelled) |
| `calendar_events` | Recurring and one-off liturgical events |
| `announcement_templates` | Reusable message templates with placeholders |
| `snippets` | Global text snippets (greetings, disclaimers) |
| `send_log` | FCM send results per announcement |
| `admin_audit_log` | All admin actions for accountability |
