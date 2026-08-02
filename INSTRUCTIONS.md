# Connecting the two machines

Two devices, two services:

- **Sim PC** (the machine running iRacing) → runs `collector/`
- **Work PC** (the strategist's machine) → runs `agent/`, and (for now, still) `relay/` + `dashboard/`

The collector reads live telemetry from iRacing's shared memory and streams it
to the agent over a WebSocket. Both machines need to be on the **same
network** (same Wi-Fi/LAN, or a race-day hotspot) — there's no internet-facing
setup here, no auth, no TLS. Treat the connection as trusted-LAN-only.

## 1. Work PC — start the agent first

The agent has to be listening before the collector tries to connect.

1. Install [Node.js](https://nodejs.org) 18+ if it isn't already.
2. From the repo root:
   ```bash
   cd agent
   npm install
   ```
3. Check `agent/.env` — it already has a working default:
   ```
   AGENT_PORT=4100
   ```
   Change the port only if `4100` is taken or you need it to match something else.
4. Find this machine's LAN IP (you'll need it for the collector's config):
   - Windows: `ipconfig` → look for "IPv4 Address" under your active adapter
   - Mac/Linux: `ipconfig getifaddr en0` or `hostname -I`
5. Start it:
   ```bash
   npm start
   ```
   You should see:
   ```
   Agent WebSocket server listening on 4100
   ```
6. **Allow the port through the Work PC's firewall** if prompted (Windows Defender Firewall will usually ask the first time — allow it on Private networks). If the collector can't connect later, this is the first thing to check.

## 2. Sim PC — start the collector

1. Install Node.js 18+ here too.
2. iRacing must already be running (in a session, or at least the client open) — the collector needs the SDK's shared memory to exist.
3. From the repo root on the Sim PC:
   ```bash
   cd collector
   npm install
   ```
   This pulls in `irsdk-node`, which includes a native addon. It's Windows-only — this step needs to happen on the actual Sim PC, not in a Linux/Mac dev environment. If `npm install` fails trying to build the native module, install the [Windows Build Tools](https://github.com/nodejs/node-gyp#on-windows) (`npm install --global windows-build-tools` or the Visual Studio Build Tools with the "Desktop development with C++" workload) and retry.
4. Edit `collector/.env` and point it at the Work PC:
   ```
   AGENT_HOST=<Work PC's LAN IP from step 1.4>
   AGENT_PORT=4100
   ```
5. Start it:
   ```bash
   npm start
   ```
   You should see, in order:
   ```
   Connected to iRacing
   Connected to agent at ws://<work-pc-ip>:4100
   ```
   And on the **agent's** console:
   ```
   Collector connected
   ```

If you see `Waiting for iRacing session...` repeating, the SDK connected to the collector process but iRacing itself isn't running/in a session yet — that's expected before you load into a car.

If the collector logs `WebSocket error` or keeps reconnecting without the agent ever logging `Collector connected`, it's almost always one of:
- Wrong `AGENT_HOST` (double-check the Work PC's IP — it can change on reconnect to Wi-Fi)
- Work PC firewall blocking the port
- Devices actually on different networks (e.g., one on a guest Wi-Fi network that isolates clients from each other)

## 3. Work PC via Docker (alternative to steps 1/3 above)

Instead of running `relay`/`agent`/`dashboard` individually, `docker compose up -d`
from the repo root starts all three together, plus `cloudflared` for team access
(see below). See `docker-compose.yml`. The collector still runs natively on the
Sim PC either way — Docker only covers the Work PC side.

There's no local Postgres container — `relay`/`agent` connect straight to the
shared Neon database (see **Database** below). Make sure the repo-root `.env`
exists before bringing the stack up, or `relay`/`agent` will start with an empty
`DATABASE_URL` and every query will fail.

## Database

Drivers, stints, and incidents live in a single shared Postgres database hosted on
[Neon](https://neon.tech) (free tier) — not a per-machine local database. This is
what lets every device hitting the dashboard see the same driver roster and
history, regardless of which one made the change.

The connection string is one Neon project's `DATABASE_URL`, needed in three places:
- `relay/.env` — for running `relay` outside Docker
- `agent/.env` — for running `agent` outside Docker
- repo-root `.env` (gitignored — copy `.env.example`) — read by `docker compose`
  for variable substitution into `relay`/`agent`'s container environment

All three should have the *same* value. It's a real credential (the connection
string embeds a password) — never commit it; `.gitignore` already excludes
`.env`/`.env.*` everywhere in the repo.

If you ever need to point this at a different Neon project (or a fresh database),
apply `db/schema.sql` to it once:
```bash
cd relay && npm install   # pulls in `pg`, used below
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({
  connectionString: '<your DATABASE_URL>',
  ssl: { rejectUnauthorized: false },
});
pool.query(fs.readFileSync('../db/schema.sql', 'utf8'))
  .then(() => { console.log('schema applied'); return pool.end(); });
"
```

## Team access

The dashboard is reachable by the whole team at **https://pitwall.murder-pitwall.com**,
via a Cloudflare named tunnel. No install needed on anyone's end — just open the
link. There's currently no login gate on it (a deliberate choice — treat the URL
itself as the only protection; don't post it somewhere public).

**Running the tunnel:** `cloudflared` is one of the services in `docker-compose.yml`,
so `docker compose up -d` starts it along with `relay`/`agent`/`dashboard` — nothing
extra to run. It mounts `~/.cloudflared/` from the Work PC read-only (the tunnel's
config + credentials JSON, tied to the `murder-pitwall.com` Cloudflare account) and
proxies to the `dashboard` container over the Docker network, not `localhost`.

If you're running `dashboard` outside Docker instead (`npm start` in step 1-style),
start the tunnel separately from any directory:
```bash
cloudflared tunnel run pitwall
```
The dashboard needs to already be up on port 5173 for the tunnel to have anything
to proxy to — but check `~/.cloudflared/config.yml`'s `service:` first, since it's
currently set to `http://dashboard:5173` (the Docker Compose service name) rather
than `http://localhost:5173`, from wiring it into Docker.

If you ever set this up on a *different* machine, you'd need to redo `cloudflared
tunnel login` there — the credentials are per-machine, not something to copy
between computers.
