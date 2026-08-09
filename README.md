# Pit wall — iRacing endurance strategy dashboard

A race strategist tool for iRacing endurance events. Runs on the Work PC —
no software required for the rest of the team. Supports any number of
MURDER entries racing in separate, concurrent sessions at once, each with
its own isolated live view (see Multi-team support below).

## Why this exists

Endurance events involve multiple drivers rotating stints, and someone off-track needs
to track fuel, position, and incidents the way a real pit wall crew would. This project
builds that role into a live dashboard, pulling telemetry directly from iRacing while
the strategist spectates the session.

## What's included

- **Collector** — runs on each Sim PC, reads iRacing's SDK shared memory (via
  `irsdk-node`), and streams raw telemetry/session data to the agent over a
  websocket. The only piece that has to run alongside the sim itself; no
  per-machine configuration needed (see Multi-team support).
- **Agent** — runs on the Work PC, receives every collector's stream, derives
  stint/fuel/incident events per team, fetches a real track outline from
  iRacing's Data API when available (falling back to a generic shape — see
  caveat below), logs history to Postgres, and broadcasts live state to the
  dashboard.
- **Relay** — a separate small API for the planning side: the driver roster,
  event entry list, and special events, backed by the same Postgres database.
  Not part of the live telemetry path.
- **Dashboard (web)** — React + Tailwind + shadcn/ui, with a team-select
  landing page and a Race View section per team (Live / Leaderboard /
  Car Info / Track Info / Strategy) plus Drivers and Stint Planner pages.
  Dark mode toggle in the nav bar.

### Multi-team support

Any number of MURDER entries can run in fully separate, concurrent iRacing
sessions — the agent keeps completely independent state per team (own stint
tracker, fuel calculator, track map, etc.), so one team's data can never
bleed into another's.

Team identity is auto-resolved, not manually configured: the agent looks at
the car number the collector is watching and matches it against
`entry_drivers.car_number` in the roster. Set a car number on an entry (the
Drivers page has a "Car #" field) and whichever Sim PC's collector connects
watching that car automatically becomes that team — no per-machine env vars,
no separate deploys. If a car number has no roster match (e.g. testing), it
still gets its own isolated bucket instead of colliding with anything.

The dashboard's `/` page lists every team from the roster; each opens at
`/t/<entry name>` with its own fully isolated live view, so multiple
strategists can watch multiple teams from the same deployment.

### Race View pages

- **Live (Pit Wall)** — track map with live car positions, a Gap Board
  (next same-class rival ahead, gap, and any different-class traffic cars in
  between), current stint, fuel estimate, and the incident log.
- **Leaderboard** — full running order with class-toggle chips (auto-populated
  from the session, IMSA-scoring style), live position/interval/gap/lap times,
  iRating, safety rating, and team name; adds a class-position column for
  multi-class fields.
- **Car Info** — current car's live telemetry.
- **Track Info** — track name/length/turns/pit speed limit, session state and
  time remaining, live weather, and a session-flag warning banner (with a
  section-level caution strip, currently placeholder — iRacing telemetry has
  no per-section flag data).

### Fuel model

A team-wide rolling average of laps-per-tank, seeded before the race and
updated after every pit stop, plus manual "gauge reading" entries the
strategist can log while spotting the current driver to correct the estimate
mid-stint.

### Track map caveat

The real track outline comes from a bundled dataset
(`agent/data/track_info.json`, `agent/data/track_settings.json`) rather than
iRacing's own Data API — that API's `track/assets` endpoint requires an
OAuth client registration, and **iRacing has currently paused issuing new
OAuth client IDs**, so it isn't usable right now (see
`agent/track_map_service.js` for the full explanation). The bundled dataset
covers 424 tracks/configs as of when it was pulled; any track missing from
it falls back to a generic stadium-shaped outline — car positions (via
`CarIdxLapDistPct`) are still live and accurate either way, just not plotted
on the real shape for an uncovered track. Once iRacing reopens OAuth
registration, the Data API becomes the better long-term source (always
current, no bundled-file staleness) and can replace this.

Track shape/settings data is from
[iRaceHUD](https://github.com/xikxp1/iRaceHUD) (GPLv3) — see
`agent/data/LICENSE` for the full license text.

## Architecture

``` markdown
iRacing (Sim PC #1)         iRacing (Sim PC #2)         ...any number more
        |                           |
        v                           v
Collector                      Collector          --- one per Sim PC, no config
        |                           |
        \___________  websocket  ___/
                     v
                   Agent   --- resolves each connection to a team by car
                     |          number, keeps fully separate state per team
                     v  websocket (tagged per team)
                 Dashboard --- /t/<team> shows one team's isolated live view

Relay  --- separate roster/entry-list/special-events API, same Postgres DB
        ^
        |
Dashboard (Drivers / Stint Planner pages)
```

Deployed via Docker Compose (`docker-compose.yml`) on the Work PC — relay,
agent, dashboard, and a `cloudflared` tunnel so the rest of the team can view
the dashboard without VPN/port-forwarding. The collector runs natively on the
Sim PC (Windows-only, needs the native SDK addon) and isn't containerized.

## Tech stack

- Collector: Node.js (`irsdk-node`)
- Agent: Node.js (`ws`, `pg`)
- Relay: Node.js + Express (roster/planning API)
- Dashboard: React + Vite + Tailwind + shadcn/ui
- Persistence: Postgres, hosted on [Neon](https://neon.tech) (managed, free tier) so
  drivers/stints/incidents persist across every device hitting the dashboard, not
  just the Work PC — see `INSTRUCTIONS.md`

## Setup

Each of `agent/.env`, `relay/.env`, and the root `.env` needs a
`DATABASE_URL` (see the respective `.env.example` files). The root `.env` is
what Docker Compose reads for variable substitution in
`docker-compose.yml` — `agent/.env`/`relay/.env` are for running those
services outside Docker.

Apply `db/schema.sql` for a fresh database, or run everything under
`db/migrations/` in order against an existing one to pick up new columns
(currently just `entry_name` on the history tables, for multi-team support).

For the real track map, also set `IRACING_EMAIL`/`IRACING_PASSWORD` in
**both** `agent/.env` and the root `.env` (Compose needs its own copy) —
though see the track map caveat above; this currently won't authenticate
until iRacing reopens OAuth client registration.

## Status

Actively in use — collector/agent/relay/dashboard are all built and running
against live sessions, including multi-team support (verified live against a
real concurrent session). Track map and split info are blocked on iRacing's
paused OAuth client registration; real verification of race-only features
(Gap Board, multi-class Leaderboard behavior) is pending the next race event.
