# DEPLOYMENT — zero-error Vercel + Render + Postgres

## A. Database (Render Postgres, 5 min)
1. Render → New → PostgreSQL → name `majisafe-db`, region closest (Frankfurt for KE).
2. After creation, open Shell / use `psql $DATABASE_URL`:
   - Paste contents of `database/schema.sql` and run.
3. Keep `External Database URL` as `DATABASE_URL`.

## B. Backend (Render Web Service) — EXACT SETTINGS (fixes ECONNREFUSED)

> Your log failed because **Start Command was `npm run seed`** and **DATABASE_URL was missing**.
> `npm run seed` needs a DB; it tried localhost ::1:5432 / 127.0.0.1:5432 → ECONNREFUSED.
> The server itself (`npm start`) now boots even without DB and reports status at /api/health.

Render Dashboard → your web service → Settings:
- **Repository:** `mwebidouglas08-netizen/water-management-system`, branch `main`
- **Root Directory:** `backend`
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`  (NEVER `npm run seed` — seed is one-time via Shell)
- **Health Check Path:** `/api/health`
- **Node version:** `20.12.0` (via `NODE_VERSION` env or `engines`)

Render Dashboard → Environment → add:
- `DATABASE_URL` → **Link → majisafe-db → connectionString** (Internal URL). Do NOT paste localhost.
- `JWT_SECRET` → Generate random value
- `FRONTEND_URL` → `https://<your-vercel-app>.vercel.app`
- `PGSSL` → `true`
- `NODE_VERSION` → `20.12.0`

Then: **Manual Deploy → Deploy latest commit**. Open `https://<backend>.onrender.com/api/health`
expect: `{"ok":true,"dbConfigured":true,"dbOk":true}`.

One-time seed (Shell tab of the web service, NOT start command):
```bash
npm run seed
```
This applies `database/schema.sql` + demo users/devices/readings.

Option 1 — Blueprint (recommended):
1. Push repo to GitHub. Render → New → Blueprint → select repo (uses `render.yaml`).
2. Set env: `FRONTEND_URL=https://<your-vercel-app>.vercel.app`, `JWT_SECRET` auto-generated.
3. Deploy. Test `https://<backend>.onrender.com/api/health` → `{ok:true}`.
4. Seed demo data once via Render Shell: `cd backend && npm run seed`
   (needs `DATABASE_URL` present — blueprint wires it).

Option 2 — Manual: New Web Service → root `backend`, build `npm install`, start `npm start`, Node 20.

Cold starts: free tier sleeps; first request ~40s. Frontend retries automatically.

## C. Frontend (Vercel)
1. Vercel → Add New Project → import GitHub repo → Root Directory `frontend`.
2. Framework: Vite. Build `npm run build`, output `dist` (auto).
3. Env var: `VITE_API_URL=https://<backend>.onrender.com` (no trailing slash).
4. Deploy. Visit `/`, register, login with seeded accounts.

## D. Wiring checklist
- [ ] Backend `/api/health` OK
- [ ] `VITE_API_URL` set on Vercel (rebuild after changing)
- [ ] `FRONTEND_URL` set on Render (CORS)
- [ ] Schema applied + seed run
- [ ] Login as school/tech/admin works
- [ ] Live readings appear (simulator fallback works with zero hardware)

## E. Common errors avoided
- `Prisma generate` — not used (plain `pg`), so no build break.
- ESM/CJS mix — backend is CJS (`require`), frontend ESM; no cross-import.
- CORS — allowlist from `FRONTEND_URL`, comma-separated ok.
- Postgres SSL — enabled automatically when URL contains `render.com`.
