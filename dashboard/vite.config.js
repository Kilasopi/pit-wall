import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      // The dashboard is served through a Cloudflare Tunnel with the
      // hostname proxied (orange-clouded). Cloudflare's default edge
      // caching treats Vite's "Cache-Control: no-cache" as cacheable
      // (it only skips caching for no-store/private) and caches each JS
      // module independently. When Vite recompiles and bumps the dep
      // pre-bundle hash, modules revalidate at different times, so the
      // browser can end up with a stale module importing an old
      // react.js?v=... hash alongside fresh modules on a newer hash —
      // surfaces as "Invalid hook call" / multiple React copies.
      name: 'no-store-dev-responses',
      configureServer(server) {
        // Vite ETags source-file transforms off the source file's own
        // content/mtime, not the dep-optimize hash embedded in the
        // rewritten import specifiers inside them. A file whose own
        // source never changes keeps the same ETag forever, so a
        // browser that cached it once just gets 304s and keeps reusing
        // that first response body — including a now-dead
        // react.js?v=<old hash> import — even after the deps hash moves
        // on. Every navigation instructs the browser to drop its cache
        // for this origin first, so it can't be poisoned again.
        server.middlewares.use((req, res, next) => {
          if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
            res.setHeader('Clear-Site-Data', '"cache"')
          }
          next()
        })

        // 'post' so this runs after Vite's own middleware (which sets its
        // own Cache-Control on the way out) instead of before it.
        return () => {
          server.middlewares.use((_req, res, next) => {
            res.setHeader('Cache-Control', 'no-store')
            next()
          })
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Even when the optimizer discovers a dependency late and re-bundles
    // it under a new hash mid-load, dedupe forces every import of these
    // packages to resolve to the one instance already mounted — closing
    // off the "Invalid hook call" failure mode at the resolution level
    // instead of just trying to avoid triggering it.
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Without this, Vite discovers these subpaths one at a time as each
    // component first renders, re-bundling React across several full
    // reloads in the same page load — components can end up wired to
    // different React module instances mid-load ("Invalid hook call").
    include: [
      'react',
      'react-dom',
      '@base-ui/react/button',
      '@base-ui/react/checkbox',
      '@base-ui/react/input',
      '@base-ui/react/select',
      '@base-ui/react/merge-props',
      '@base-ui/react/use-render',
    ],
  },
  server: {
    // Pre-transform the real entry point as soon as the server boots
    // instead of waiting for the browser's first request to kick off
    // dependency discovery — closes the window where a mid-render
    // re-optimize could hand different components different React
    // module instances.
    warmup: {
      clientFiles: ['./src/main.jsx'],
    },

    // Vite's Host-header check otherwise rejects any hostname it doesn't
    // recognize. *.trycloudflare.com covers the free quick-tunnel fallback;
    // the named-tunnel hostname is the real one in day-to-day use.
    allowedHosts: ['.trycloudflare.com', 'pitwall.murder-pitwall.com', 'spectate.murder-pitwall.com'],

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
      '/ws-relay': {
        target: process.env.RELAY_PROXY_TARGET || 'http://localhost:4000',
        ws: true,
      },
      '/ws-agent': {
        target: process.env.AGENT_PROXY_TARGET || 'ws://localhost:4101',
        ws: true,
      },
    },
  },
})
