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

## 3. What's not wired up yet

The agent currently just receives and logs telemetry/session data — it doesn't
yet compute fuel/strategy numbers, store anything, or serve the dashboard.
`relay/` + `dashboard/` still work exactly as before and are unaffected by
any of this.

## Team access

Right now this is a single-user, strategist-only tool (see [README.md](README.md)) — your
drivers don't need to install or run anything, and there's no dashboard URL for them to
open. If you want teammates to see the live dashboard too, that's a separate feature to
build, not something this setup gives you automatically. The two realistic options once
it's worth doing:

- **Same-room LAN view** — point a browser at the Work PC's IP and the dashboard's dev
  server port. Fine for a spotter/pit crew sitting in the same room on race day, but
  gives everyone on the network read access to whatever the dashboard exposes.
- **Remote access** — needs an actual deployment story (hosting, auth, HTTPS) rather than
  pointing people at a laptop's dev server. Bigger scope, worth its own discussion before
  building.
