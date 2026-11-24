import axios from 'axios';

/**
 * Resolve the API base URL.
 *
 * 1. `VITE_API_URL` (set in Vercel → Settings → Environment Variables) always
 *    wins and is baked into the bundle at build time.
 * 2. With no env var we only fall back to `http://localhost:5000` when the app
 *    is actually being opened on localhost. A *deployed* browser pointed at
 *    localhost has nothing listening on that port, and that is exactly what
 *    shows up as a bare "Failed to fetch" on sign-in and registration.
 * 3. Otherwise use a same-origin `/api` base, which works behind a dev-server
 *    proxy or any reverse proxy / rewrite.
 */
function isLocalHost() {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.local');
}

const envUrl = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

function resolveBaseURL() {
  if (envUrl) return /\/api$/.test(envUrl) ? envUrl : `${envUrl}/api`;
  if (isLocalHost()) return 'http://localhost:5000/api';
  return '/api'; // same-origin — relies on a proxy/rewrite in front of the API
}

export const API_BASE_URL = resolveBaseURL();
// True when we know a real, reachable backend address (env var set, or local dev).
export const API_URL_CONFIGURED = Boolean(envUrl) || isLocalHost();

const api = axios.create({
  baseURL: API_BASE_URL,
  // Free hosting tiers sleep: allow the cold start to finish instead of
  // aborting the request (an abort also looks like "Failed to fetch").
  timeout: 45000
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('majisafe_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

/** No HTTP response at all: DNS failure, CORS block, connection refused, offline. */
export function isNetworkError(e) {
  return !e || (!e.response && e.code !== 'ECONNABORTED' && e.code !== 'ETIMEDOUT');
}

export function isTimeoutError(e) {
  return Boolean(e) && (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT');
}

export function apiErrorMessage(e, fallback) {
  if (isTimeoutError(e)) {
    return 'The server took too long to answer. On free hosting it may still be waking up — wait about 30 seconds and try again.';
  }
  if (isNetworkError(e)) {
    if (!API_URL_CONFIGURED) {
      return `This build of the app has no backend address configured (it is calling ${API_BASE_URL}). Set VITE_API_URL to your API URL (for example https://majisafe-backend.onrender.com) in your hosting dashboard, then redeploy the frontend.`;
    }
    return `Cannot reach the API at ${API_BASE_URL}. The server may be starting up — wait about 30 seconds and try again. If it keeps failing, check that the backend is running and that its FRONTEND_URL setting allows ${typeof window !== 'undefined' ? window.location.origin : 'this site'}.`;
  }
  const body = e.response?.data;
  // The API always explains 4xx/5xx in `error`. Show it verbatim: a server-side
  // database hiccup must not be dressed up as "check your password".
  if (body && typeof body.error === 'string' && body.error.trim()) return body.error;
  if (body && typeof body.reply === 'string' && body.reply.trim()) return body.reply;
  const status = e.response?.status;
  if (status === 503) return 'The service is temporarily unavailable. Please try again in a moment.';
  if (status >= 500) return 'The server hit a problem handling that request. Please try again.';
  return fallback;
}

/**
 * Retry *network-level* failures (server asleep / CORS / flaky link) with
 * backoff. A real HTTP answer — 4xx/5xx — is never retried: the user needs to
 * see that message immediately.
 */
export async function withNetworkRetry(fn, onWait, { attempts = 3, waitMs = 8000 } = {}) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (e && e.response) throw e;
      if (i === attempts - 1) throw e;
      if (onWait) onWait(i + 1, attempts - 1);
      await new Promise((r) => setTimeout(r, waitMs * (i + 1)));
    }
  }
  throw last;
}

export default api;
