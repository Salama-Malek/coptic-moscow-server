# Coptic Orthodox Church Moscow — Notification App

A trilingual (Arabic / Russian / English) parish app for the Coptic Orthodox community in Moscow. Clergy send announcements, voice messages, live-stream links, and schedule service reminders via the admin web panel; parishioners receive push notifications, watch Sunday Liturgy live-streams, and consult the daily Coptic fasting calendar on their phones. Built with React Native (Expo) + Node.js/Express + MySQL + Firebase Cloud Messaging, served from Hostinger.

## Layout (monorepo)

```
.
├── src/                ← Node.js / Express API server
├── admin-web/          ← React + Vite admin panel (served at /admin)
├── mobile/             ← React Native (Expo) mobile app
├── docs/               ← ADMIN_GUIDE_*.md, ARCHITECTURE.md, FCM_SETUP.md, etc.
├── AUDIT_PLAN.md       ← Living checklist from the pre-launch audit
├── TEST_PLAN.md        ← Smoke-test walkthrough for each feature
├── package.json        ← Server + admin-web deploy artifact
└── tsconfig.json
```

Hostinger auto-deploys the `main` branch into `~/domains/coptic-notify.sm4tech.com/nodejs/`. The `npm run build` script compiles the server (`tsc`), copies migrations into `dist/`, and builds the admin-web bundle.

## Production

Live: **https://coptic-notify.sm4tech.com**
- Admin panel: `/admin`
- Health probe: `/api/health`

## Development

### Server + Admin Panel

```bash
cp .env.example .env   # fill in DB + JWT + Firebase paths
npm install
npm run dev            # server + admin panel with HMR
```

### Admin Panel (standalone Vite dev)

```bash
cd admin-web
npm install
npm run dev            # http://localhost:5173/admin
```

### Mobile App (Expo)

```bash
cd mobile
npm install
npm run dev            # expo start --dev-client
# Install the dev client APK on your Android device first (via EAS Build)
```

### Tests

Coptic fasting calendar golden-day suite (pure-TS, no jest):
```bash
cd mobile && npm run test:fasting
```

## Deploy

Server: push to `main` → Hostinger auto-deploy. Migrations auto-apply on server restart (`runMigrations()`).

Mobile: `cd mobile && npx eas build --platform android --profile preview`.

See [TEST_PLAN.md](TEST_PLAN.md) for the post-deploy smoke-test checklist and [AUDIT_PLAN.md](AUDIT_PLAN.md) for the living audit log.
