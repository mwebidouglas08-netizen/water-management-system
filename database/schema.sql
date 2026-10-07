-- MajiSafe Postgres schema
-- Applied automatically at server boot (see backend/src/migrate.js) and by seed.
-- Note: gen_random_uuid() is built into PostgreSQL 13+, no extension needed.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user','technician','admin')),
  org_name VARCHAR(160) DEFAULT '',
  phone VARCHAR(40) DEFAULT '',
  location VARCHAR(160) DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  site VARCHAR(160) NOT NULL DEFAULT 'Main Tank',
  device_key VARCHAR(80) UNIQUE NOT NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'tank-node',
  capacity_liters INTEGER NOT NULL DEFAULT 10000,
  lat DOUBLE PRECISION DEFAULT 0,
  lng DOUBLE PRECISION DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'online',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS readings (
  id BIGGENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  volume_liters NUMERIC(12,2) NOT NULL DEFAULT 0,
  flow_lpm NUMERIC(8,2) NOT NULL DEFAULT 0,
  pressure_bar NUMERIC(5,2) NOT NULL DEFAULT 0,
  tds_ppm NUMERIC(8,2) NOT NULL DEFAULT 0,
  turbidity_ntu NUMERIC(8,2) NOT NULL DEFAULT 0,
  ph NUMERIC(4,2) NOT NULL DEFAULT 7,
  temp_c NUMERIC(5,2) NOT NULL DEFAULT 22,
  battery NUMERIC(5,2) DEFAULT 100
);
CREATE INDEX IF NOT EXISTS idx_readings_device_ts ON readings(device_id, ts DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(40) NOT NULL, -- leak_suspected | burst | low_level | shortage_risk | purity_risk | offline
  severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- low|medium|high|critical
  title VARCHAR(200) NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  ai_advice TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_name VARCHAR(120) NOT NULL DEFAULT '',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  category VARCHAR(40) NOT NULL DEFAULT 'leakage', -- leakage|shortage|quality|burst|billing|other
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location VARCHAR(200) NOT NULL DEFAULT '',
  lat DOUBLE PRECISION DEFAULT 0,
  lng DOUBLE PRECISION DEFAULT 0,
  photo_url TEXT DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','resolved','rejected')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  ai_triage TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'assigned',
  note TEXT DEFAULT '',
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, created_at DESC);
