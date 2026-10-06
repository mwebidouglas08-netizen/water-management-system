# DESIGN — MajiSafe (Waterfall Phase 2)

## Architecture
```
[ESP32 sensors] --HTTP POST /api/ingest/:deviceKey--> [Express API] --> [Postgres]
        |                                                    |  |
   (flow, level,                                  AI engine  |  +--> [Vite React on Vercel]
    TDS, turbidity,                               simulator -+       dashboards + Daggy
    pH, pressure)
[C citizen reports] --> API --> technician inbox --> job --> resolved
```

- Frontend: Vite React + react-router + recharts + axios. `VITE_API_URL` points to Render.
- Backend: Express, `pg` pool, JWT, bcryptjs, cors, morgan. No ORM to avoid deploy breakage.
- DB: Postgres tables users, devices, readings, alerts, reports, jobs, messages.

## Data model
See `database/schema.sql`. Key relations:
users 1—N devices 1—N readings; users 1—N alerts; reports N—1 technician; reports 1—N jobs; messages user→user (+report).

## AI design (explainable, offline-first)
`backend/src/services/ai.js`:
- `purityScore({tds, turbidity, ph})` 0–100 + grade (Excellent/Good/Fair/Poor/Unsafe) + advice.
  WHO-ish thresholds: TDS <300 excellent, <600 good, <1000 fair, else poor; turbidity <1 excellent,
  <5 good, else poor; pH 6.5–8.5 good.
- `detectLeak(recentReadings)`: night-flow (00–04h avg flow > 2 L/min for tank-fed) OR
  continuous low flow 6h+ with level falling steadily → leak_suspected. Burst: flow spike
  > 3x median + pressure drop >25%.
- `shortageForecast(latest, avgDailyUse)`: litres / daily use = days left; <2d critical.
- `triageReport(title+desc+category)`: keyword + priority scoring → suggested priority,
  likely cause, tools checklist for technician.
All outputs include human-readable `ai_advice`, never black-box only.

## IoT design
Payload: `{ level_percent, flow_lpm, pressure_bar, tds_ppm, turbidity_ntu, ph, temp_c, battery }`
Server derives `volume_liters = level% * capacity`. Simulator generates realistic day curve
(morning/evening peaks, night trickle, random leak injection toggle).

ESP32: see `docs/IOT_GUIDE.md`. Device key per device (printed QR in real rollout).

## UI design
Landing split sections: Hero (HD dam/tank image) / Stats / Problem / How-it-works (IoT→AI→Action)
 / Live demo strip / Dashboards preview / IoT kit / Pricing / Testimonials / FAQ / CTA + Footer.
Auth: split card with image side.
Dashboards: sidebar + topbar + cards + charts + tables. Role guard routes:
`/app` user, `/tech` technician, `/admin` admin. Daggy floating button everywhere.

## Security
JWT in localStorage (v1 simple) + Bearer; role middleware; bcrypt 10 rounds;
ingest authenticated by deviceKey + optional `INGEST_SECRET`; CORS `FRONTEND_URL`.
