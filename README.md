# Pit wall — iRacing endurance strategy dashboard

A single-user race strategist tool for iRacing endurance events. Runs entirely on the
strategist's machine — no software required for the rest of the team.

## Why this exists

Endurance events involve multiple drivers rotating stints, and someone off-track needs
to track fuel, position, and incidents the way a real pit wall crew would. This project
builds that role into a live dashboard, pulling telemetry directly from iRacing while
the strategist spectates the session.

## What's included

- **Telemetry agent** — connects to iRacing (in spectator mode) and reads live
  session data: car positions, lap counts, gaps, and pit road status for the whole
  field via the SDK's shared memory interface.
- **Relay server** — receives telemetry from the agent, computes derived stats,
  logs stint and incident history to a database, and broadcasts live state to the
  dashboard over a websocket.
- **Dashboard (web)** — the strategist's live view: current position, gap to the
  car ahead, session time remaining, stint timer with swap countdown, a fuel panel,
  a simplified track map with car positions, and an incident log.
- **Fuel model** — a team-wide rolling average of laps-per-tank, seeded before the
  race and updated after every pit stop, plus manual "gauge reading" entries the
  strategist can log while spotting the current driver to correct the estimate
  mid-stint.
- **Track map** — car positions plotted along a simplified track outline using
  each car's lap-distance percentage, since iRacing doesn't expose true GPS
  coordinates via telemetry.

## Architecture

```
iRacing (spectator mode)
        |
        v
Telemetry agent  --- reads shared memory, runs on the strategist's PC
        |
        v  websocket
Relay server  --- computes stats, logs to Postgres, broadcasts state
        |
        v  websocket
Dashboard  --- live view in the browser
```

Only the strategist needs anything installed or running — the rest of the team
races normally with no extra software.

## Tech stack

- Agent: Python (`pyirsdk`)
- Relay: Node.js + Express + `ws`
- Dashboard: React + Tailwind + shadcn/ui
- Persistence: Postgres (stint history, incident log)

## Scope

### v1
- Live position, gap, session time remaining
- Stint elapsed timer
- Fuel: pre-race laps-per-tank estimate, live remaining-laps estimate, manual
  gauge-reading correction
- Simplified track map with live car markers
- Shared incident/notes log

### v2 (later)
- Automated driver-swap countdown against the team's stint length rules
- Per-stint history and a post-race review page
- Authentication so the dashboard isn't a public URL

## Status

Planning stage — architecture and feature scope defined, implementation not yet
started.