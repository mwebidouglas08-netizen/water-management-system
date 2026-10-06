# MajiSafe — Smart Water Management System

Institution-first IoT + AI platform for live water monitoring, leakage detection,
purity tracking, shortage prediction, citizen reporting, and technician dispatch.

Built with Waterfall model by the founding team. Local-first design for
schools, hospitals, estates, factories, water vendors and utilities in Kenya/East Africa —
usable anywhere in the world.

## Problem we solve
- 30-45% of treated water is lost as Non-Revenue Water through leaks & bursts.
- Institutions run out of tank/borehole water without warning (shortages).
- Water purity (turbidity, TDS, pH, chlorine) is rarely monitored live — health risk.
- Citizens see leaks/bursts but have no direct channel to technicians/authorities.
- Technicians work with paper/WhatsApp, no triage, no inbox, no AI assist.
- Admins have no single oversight of users, devices, reports, and consumption.

## Solution — MajiSafe
- **IoT live monitoring:** ESP32 + flow + ultrasonic level + TDS/turbidity/pH sensors
  POST to backend every 30-60s. Built-in simulator keeps demo alive without hardware.
- **AI engine:** night-flow leakage detection, burst detection, purity scoring,
  shortage forecast (days-to-empty), anomaly alerts.
- **3 dashboards:** Institution/User, Technician, Admin.
- **Reporting:** geo-tagged leak / shortage / quality reports with photo note → routed to technician inbox.
- **Daggy chatbot:** in-app AI assistant with deep knowledge of the app.

## Monorepo layout
```
water-management-system/
  frontend/   → Vite + React (deploy on Vercel)
  backend/    → Node Express + Postgres (deploy on Render)
  database/schema.sql
  docs/       → REQUIREMENTS, DESIGN, IOT_GUIDE, DEPLOYMENT
  render.yaml → Render blueprint
```

## Quick start (local)

### 1. Database (Postgres)
Create DB `majisafe`, then:
```bash
psql $DATABASE_URL -f database/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # fill DATABASE_URL, JWT_SECRET
npm install
npm run seed           # creates demo users + devices + readings
npm run dev
# API → http://localhost:5000  health: /api/health
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env   # set VITE_API_URL=http://localhost:5000
npm install
npm run dev
# App → http://localhost:5173
```

### Demo accounts (after seed)
- Admin: `admin@majisafe.ke` / `Admin123!`
- Technician: `tech@majisafe.ke` / `Tech123!`
- Institution/User: `school@majisafe.ke` / `User123!`

## Deploy
- Frontend → Vercel: root `frontend/`, framework Vite, env `VITE_API_URL=<render-backend-url>`
- Backend → Render: `render.yaml` blueprint, env `DATABASE_URL` (Render Postgres), `JWT_SECRET`, `FRONTEND_URL`
- Database → Render Postgres, then run `database/schema.sql` once + `npm run seed` (or seed via Render shell).

Full steps: see `docs/DEPLOYMENT.md`. IoT wiring: `docs/IOT_GUIDE.md`.

## Waterfall process used
1. Requirements → `docs/REQUIREMENTS.md`
2. Design → `docs/DESIGN.md`
3. Implementation → `frontend/` + `backend/`
4. Verification → `npm run build` both sides, health checks
5. Maintenance → issues via in-app Reports + Daggy feedback

© 2026 MajiSafe founding team.
