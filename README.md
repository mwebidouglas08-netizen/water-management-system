# MajiSafe — Smart Water Management System

Institution-first IoT and AI platform for live water monitoring, leakage
detection, purity tracking, shortage prediction, citizen reporting, and
technician dispatch. Designed local-first for schools, hospitals, estates,
factories, water vendors and utilities in Kenya and East Africa — usable
anywhere in the world.

## The problem

- 30–45% of treated water is lost as non-revenue water through leaks and bursts.
- Institutions run out of tank or borehole water with zero warning.
- Water purity (turbidity, TDS, pH) is rarely monitored live — a health risk.
- Citizens see leaks and bursts but have no direct channel to technicians.
- Technicians triage over phone and paper, with no inbox or diagnostic help.
- Managers have no single view of users, devices, reports and consumption.

## What MajiSafe does

- **Live IoT monitoring** — ESP32 sensor units (level, flow, pressure, TDS,
  turbidity, pH) report every minute; a built-in simulator keeps dashboards
  alive where hardware is not yet installed.
- **Explainable AI engine** — night-flow leak detection, burst spike +
  pressure-drop detection, 0–100 purity scoring, days-to-empty shortage
  forecasts, per-device briefings and report triage. Deterministic and
  offline-capable: no paid third-party AI API required.
- **Three workspaces** — Institution/User, Technician (verified), Admin.
- **Reporting loop** — geo-tagged reports route to technician inboxes with
  automatic status updates back to the reporter.
- **Daggy assistant** — in-app guide with deep knowledge of the product,
  answering from live readings where relevant.

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite 5, React Router 6, Recharts, Axios | Deployed on Vercel; installable PWA (manifest + service worker + icons) |
| Backend | Node.js 20, Express 4, `pg` 8 (no ORM), JWT auth, bcrypt | Deployed on Render; auto-migrates schema on boot; health at `/api/health` |
| Database | PostgreSQL 13+ | `database/schema.sql` is the single source of truth; all tables `IF NOT EXISTS` |
| Intelligence | Deterministic rules + statistics (`backend/src/services/ai.js`) | Night-flow/burst heuristics, WHO-guided purity bands, triage scoring |
| IoT firmware | ESP32 (Arduino) | HTTP `POST /api/ingest/:deviceKey`; wiring in `docs/IOT_GUIDE.md` |
| Typography | Fraunces (variable, WONK) + Public Sans | Editorial system, no emoji iconography |

## Development model

Built with the **Waterfall model**, phase by phase:

1. **Requirements** → `docs/REQUIREMENTS.md`
2. **Design** → `docs/DESIGN.md` (architecture, data model, AI design, UI)
3. **Implementation** → `frontend/` + `backend/` (+ `database/schema.sql`)
4. **Verification** — `vite build`, backend boot checks, `/api/health`
   (`dbConfigured`, `dbOk`, `tables`, `migrate` status)
5. **Maintenance** — issues arrive as in-app reports; fixes ship via `main`

## Repository layout

```
water-management-system/
  frontend/          → Vite + React app (Vercel, root directory)
    public/          → favicon, PWA icons, manifest.webmanifest, sw.js
    src/             → pages, dashboards, Daggy chat, API client, styles
  backend/           → Express API (Render, root directory)
    src/routes/      → auth, devices, readings, reports, tech, admin, chat
    src/services/    → ai.js, iotSimulator.js, provision.js
    src/migrate.js   → applies database/schema.sql on boot (with retries)
  database/schema.sql→ full schema + KYC columns (single source of truth)
  docs/              → REQUIREMENTS, DESIGN, IOT_GUIDE, DEPLOYMENT
  render.yaml        → Render blueprint (service + Postgres)
```

## Run locally

**1. Database** — create database `majisafe` (schema applies automatically on
boot, or manually):

```bash
psql $DATABASE_URL -f database/schema.sql
```

**2. Backend**

```bash
cd backend
cp .env.example .env   # set DATABASE_URL, JWT_SECRET (see table below)
npm install
npm start              # API → http://localhost:5000
```

**3. Frontend**

```bash
cd frontend
cp .env.example .env   # set VITE_API_URL=http://localhost:5000
npm install
npm run dev            # app → http://localhost:5173
```

## Environment variables

| Variable | Service | Purpose |
|---|---|---|
| `DATABASE_URL` | Backend | Postgres connection string (link the managed database) |
| `JWT_SECRET` | Backend | Long random string signing sessions (generate, never commit) |
| `FRONTEND_URL` | Backend | Allowed CORS origin(s), comma-separated |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Backend | First admin, created on boot only if no admin exists |
| `PGSSL` | Backend | Set `true` on managed Postgres |
| `NODE_VERSION` | Backend | Pinned to `20.12.0` |
| `VITE_API_URL` | Frontend | Backend base URL, no trailing slash (baked in at build time) |

Never commit `.env` files or tokens. If a secret is ever exposed, rotate it
and redeploy; users simply sign in again (7-day JWTs).

## Access & roles

- **Institutions / residents** — self-register, instant access, demo tank
  provisioned automatically.
- **Technicians** — register with national ID and documents; accounts stay
  locked until an admin verifies them (unlock is instant, no re-login needed).
- **Admins** — created from `ADMIN_EMAIL`/`ADMIN_PASSWORD` on first boot;
  sign in to reach `/admin` (approvals, users, triage, analytics, demo data).

## Deployment (summary)

- **Frontend → Vercel:** import repo, root directory `frontend`, framework
  Vite, set `VITE_API_URL`, deploy. Rebuild after any env change.
- **Backend → Render:** Blueprint from `render.yaml`, or manual Node 20
  service (build `npm install`, start `npm start`, health path `/api/health`).
  Link Postgres as `DATABASE_URL`; **start command is `npm start`** —
  seeding/migrating happen automatically.
- **Database → Render Postgres:** schema and demo bootstrap are automatic on
  boot; extra demo content via Admin → Command → Load demo dataset.

Full steps: `docs/DEPLOYMENT.md`. Sensor wiring: `docs/IOT_GUIDE.md`.

## Security posture

bcrypt-hashed passwords, 7-day JWTs, role + verification guards, parameterized
SQL throughout, CORS allowlist (never `*` with credentials), per-route and
global async error containment, PII (KYC documents) visible only to admins.

## Roadmap

Native offline-first mobile app, M-Pesa billing, GIS pipe network map,
SMS/WhatsApp alerts via Africa's Talking, Swahili-first voice reporting.

## Contact

mwebidouglas08@gmail.com · +254 796 820 013 · Mon–Sat, 8am–6pm EAT

© 2026 MajiSafe. Every drop, accounted for.
