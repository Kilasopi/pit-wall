import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Cloudflare's free quick tunnels assign a random *.trycloudflare.com
    // hostname on each restart — Vite's Host-header check would otherwise
    // reject it as an untrusted host.
    allowedHosts: ['.trycloudflare.com'],

    // Proxies relay's REST API and the agent's dashboard broadcast through
    // this same origin/port, so the whole app works behind a single tunneled
    // URL — a remote viewer's browser can't reach "localhost:4000" on the
    // Work PC, only whatever origin the page itself was loaded from.
    //
    // Targets are overridable because this proxy runs server-side: inside
    // Docker Compose, "localhost" means the dashboard container itself, not
    // the relay/agent containers — those need to be reached by service name.
    proxy: {
      '/api': process.env.RELAY_PROXY_TARGET || 'http://localhost:4000',
      '/ws-agent': {
        target: process.env.AGENT_PROXY_TARGET || 'ws://localhost:4101',
        ws: true,
      },
    },
  },
})
