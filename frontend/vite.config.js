import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Warn loudly at build time when a production bundle would ship with no API
 * address configured — that is the configuration that produces a bare
 * "Failed to fetch" the moment someone tries to sign in or register.
 */
function apiUrlGuard() {
  return {
    name: 'majisafe-api-url-guard',
    configResolved(config) {
      const url = String(config.env?.VITE_API_URL || '').trim();
      if (config.command === 'build' && !url) {
        console.warn(
          '\n[majisafe] NOTE: VITE_API_URL is not set for this build.\n' +
          '[majisafe] The bundle will call the API on the same origin (/api) when hosted,\n' +
          '[majisafe] and on http://localhost:5000 during local development.\n' +
          '[majisafe] On Vercel, set VITE_API_URL=https://<your-backend>.onrender.com and redeploy.\n'
        );
      }
    }
  };
}

// In development the browser calls /api on the Vite origin and Vite proxies it
// to the API, so sign-in and registration never depend on CORS at all.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://127.0.0.1:5000';
  const proxy = { '/api': { target: proxyTarget, changeOrigin: true } };

  return {
    plugins: [react(), apiUrlGuard()],
    server: { host: '0.0.0.0', port: 5173, strictPort: true, allowedHosts: true, proxy },
    preview: { host: '0.0.0.0', port: 5173, strictPort: true, allowedHosts: true, proxy }
  };
});
