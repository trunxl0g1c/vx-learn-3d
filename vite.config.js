import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Bind 0.0.0.0 instead of just localhost so the dev server is reachable
    // from outside the container (Docker) / outside this machine (LAN).
    host: true,
    port: 5173,
    strictPort: true,
    // Vite validates the incoming Host header and rejects anything not on
    // its allowlist (CVE-2025-30208 hardening). That allowlist doesn't know
    // about a LAN IP or a shared domain, so it 403s everyone but localhost
    // unless disabled — fine here since this is a dev server we're
    // deliberately exposing, not a hardened prod deployment.
    allowedHosts: true,
    watch: {
      // Docker Desktop on Windows doesn't reliably forward inotify events
      // for a bind-mounted NTFS path into the Linux container, so edits on
      // the host never reach chokidar's native watcher — HMR silently does
      // nothing. Polling works regardless of how the mount delivers changes.
      // VITE_USE_POLLING is set in the Dockerfile, so a plain host `npm run
      // dev` (native fs events work fine there) isn't slowed down by it.
      usePolling: !!process.env.VITE_USE_POLLING,
      interval: 300,
    },
  },
});
