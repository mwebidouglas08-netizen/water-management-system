# REQUIREMENTS — MajiSafe (Waterfall Phase 1)

## 1. Vision
Help institutions (schools, hospitals, estates, factories) and surrounding
communities stop losing water, avoid shortages, and drink safe water — using
low-cost IoT + AI + human reporting loop.

## 2. Local problem framing (Kenya / East Africa, generalizable)
- Schools close kitchens/toilets when tanks run dry with zero warning.
- Estates get 2-day rationing; leaks in risers run for weeks unseen.
- Borehole + county water blending causes turbidity/TDS spikes; no live purity check.
- Burst pipes flood roads; citizens post on WhatsApp, no ticket reaches a technician.
- Technicians lack triage: travel far for minor issues while bursts wait.
- Admins/boards lack data: how much used, lost, per site, per month.

## 3. Users / Personas
1. **Institution User (primary):** facility manager, school bursar, estate caretaker.
   Wants: live tank %, litres, flow, purity score, leak/shortage alerts, monthly use,
   report a burst/leak/shortage, track ticket status.
2. **Technician:** plumber/water officer. Wants: inbox of assigned + nearby open tickets,
   device health, AI diagnosis (likely cause + tools + steps + spares), job update,
   message citizen, work history.
3. **Admin:** system owner / utility manager. Wants: all users, approve/suspend
   technicians, onboard institutions, all devices/readings, all reports/jobs,
   broadcast alerts, analytics of NRW & resolution SLA.

## 4. Functional requirements
- FR1 Landing page with HD visuals, problem/solution, IoT kit, pricing, FAQ.
- FR2 Auth: register (role user default; technician needs approval), login JWT, sessions.
- FR3 User dashboard: site selector, live gauges, 24h/7d charts, purity panel,
  AI insights (leak, burst, shortage forecast, quality advice), alerts feed,
  reports CRUD + status timeline, consumption stats, device mgmt.
- FR4 Technician dashboard: KPI (open/assigned/done, SLA), inbox (reports + direct messages),
  AI helper (diagnose from readings + description → cause, confidence, checklist),
  jobs board, device health, availability toggle.
- FR5 Admin dashboard: KPIs, user table (search/filter/approve/suspend),
  technician approval queue, all reports triage + assign, all devices, analytics,
  broadcast message, audit of alerts.
- FR6 IoT ingest: `POST /api/ingest/:deviceKey` with sensor payload; simulator fallback.
- FR7 AI engine: rule + stats based, explainable, no paid API required.
- FR8 Daggy chatbot: answers how-to, interprets readings, guides reporting/escalation.
- FR9 Notifications: in-app alerts + messages; extensible to SMS/WhatsApp via Africa's Talking.

## 5. Non-functional
- Deploy: frontend Vercel, backend Render, DB Render Postgres. Zero-error cold start.
- Mobile-first responsive, works on 3G, English + Swahili labels where helpful.
- Secure: bcrypt, JWT 7d, role guards, parameterized SQL, CORS allowlist, rate limit ingest.
- Reliability: simulator keeps demo live; offline device flagged after 5 min no-data.
- Cost: free-tier friendly; no mandatory external AI billing.

## 6. Scope / Out of scope v1
In: everything above. Out: mobile native app, Mpesa billing, GIS pipe map v2, ML training pipeline.
