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

## Roadmap notes

#### MURDER-only scope for now — 2026-08-14
Login/accounts (`users` table, JWT auth, claim-a-driver-profile flow) are
being built MURDER-only for now — no multi-tenant/multi-team-org support.
There's real interest from ~5-10 other teams in a product like this
eventually, but retrofitting multi-tenancy (a `teams` table, `team_id`
scoping across nearly every table, per-team branding, etc.) properly needs
its own dedicated design pass once this has been used for real by one team
first — not guessed at mid-flight tonight. If that direction is pursued
later, treat it as its own planning session, not an incremental patch onto
the MURDER-specific schema.

#### Auth architecture: separate `users` table — 2026-08-14
Login credentials live in a separate `users` table
(username/password_hash/discord_id/phone_number, nullable `driver_id` link)
rather than columns bolted onto `murder_drivers`. First pass (migration 012)
put them directly on `murder_drivers`; reworked (migration 013) before any
real account existed, since decoupling "who can log in" from "which roster
row is that" is what makes a future multi-team split less painful, without
actually building multi-tenancy now.

#### Claim-profile flow: dropdown now, invite-link later — 2026-08-14
New accounts pick their name from a dropdown of unclaimed `murder_drivers`
rows rather than self-declaring a name at signup — self-declaring would let
anyone claim to be any driver, with nothing to check against. Known gap:
nothing currently stops a logged-in user from claiming *someone else's*
unclaimed name from that dropdown (pure honor system) — acceptable for now
since it's a small trusted friend group who'd notice/flag it immediately,
not acceptable if this ever opens up beyond that. Better fix considered and
deferred: an invite-link tied to a specific driver row, generated by a Team
Owner/Manager role (which doesn't exist yet — role flags are also deferred),
so claiming requires the actual link rather than a guessable dropdown pick.

#### Garage61 login ruled out — 2026-08-14
Considered using Garage61 OAuth as a "login with Garage61" option for real
drivers instead of building username/password auth. Ruled out — their
public API appears to use personal access tokens, not an OAuth flow meant
for third-party apps to authenticate their own users. Worth re-checking
their developer docs directly (couldn't be fully confirmed — their docs
site is JS-rendered and didn't come through via fetch) if this comes up
again.

#### Timeslot voting UI still unwired — 2026-08-14
Backend for per-timeslot availability voting is built
(`race_event_timeslot_votes`, vote/unvote routes, both gated by
`requireAuth`) but the `RacePlanner.jsx` frontend UI isn't wired up yet.
Original plan (before login existed) was "one row per team member, anyone
can click anyone's checkbox" since there was no way to know who's viewing.
Now that login/`req.userId` exists, worth reconsidering whether voting
should scope to "your own row" via the logged-in user instead, once
`users.driver_id` claiming is actually in use.

#### `race_event_signups.car_class` left unconstrained — 2026-08-13
`car_class` on `race_event_signups` is plain `TEXT NOT NULL`, not an
enum/CHECK constraint like `entry_drivers.car_type` is. Decided during the
timeslot-scraping session — special events have varied/non-fixed car
classes (unlike the regular season's fixed GTP/LMP2/GT3/GT4), so a rigid
enum would break on real data. Revisit only if special-event classes turn
out to actually be a fixed, known set worth validating against.

#### Team car/timeslot confirm has no vote-count gate — 2026-08-26
Locking a team's car (`locked_car_name`) or timeslot (`locked_timeslot_id`)
never checks vote counts server-side — any team member can click "Confirm"
on any tallied option and it just writes, even with a lone vote. Started as
a strict unanimous-vote requirement, then deliberately relaxed: insisting on
unanimity/full turnout before a team could lock in a plan would block
confirmation indefinitely if one driver forgot to vote. Votes
(`race_event_car_votes`, `race_event_timeslot_votes`) are purely an
"interest" signal now, not a gate. Car voting is also multi-select per
driver (migration 017) instead of one car per driver, for the same
"just show interest" reasoning.

#### Confirmed car/timeslot must stay unlockable — 2026-08-26
Every lock action (`lock-car`, `lock-timeslot`) has a matching unlock
endpoint that clears it back to `NULL`. Learned from a real 6hr race with
Quinton where the team had to change both car and timeslot mid-event after
getting knocked out early — a one-way "confirm" would have blocked that.
Any future feature that finalizes a race-planning decision should ship with
an undo path from the start, not as an afterthought.

#### Stint planner: roster and race settings decoupled from stints — 2026-08-26
`entry_drivers` used to be the only source of both "who's on this team" and
"what stints exist," which meant a team's roster only ever showed drivers
who already had a stint (issue #31's actual bug) and race start/length had
nowhere to live before the first stint existed. Fixed by moving race-level
settings (`race_start_at`, `race_length_minutes`, `practice_minutes`,
`quali_minutes`, `quali_signup_id`) onto `race_event_teams` (migrations
019-020) and sourcing the roster from `race_event_team_members` directly via
a new `GET /api/teams/:teamId/roster` endpoint, independent of whatever
stints exist. `entry_drivers` (migration 018 adds `team_id`) is now purely
the schedule and can legitimately be empty. Locking a timeslot auto-fills
`race_start_at`/`race_length_minutes` from the timeslot/race event, so
nobody re-enters that manually.

#### Quali driver is a stub pending Garage61 (#9) — 2026-08-26
`race_event_teams.quali_signup_id` (migration 020) and a plain dropdown in
the team stint planner let a team pick who's qualifying, but there's no
lap-time data behind it — issue #9's Garage61 integration doesn't exist yet.
Swap the plain picker for one informed by real fastest-lap data once that's
built; the column/UI already exist so that's additive, not a rework.

#### Driver blackout feature designed, deferred — 2026-08-26
Full design (a new `race_event_blackouts` table, endpoints, a UI section,
and a check that warns when confirming a timeslot inside a member's blocked
range) worked out but not built — tracked as issue #47, a sub-issue of #20.
Deferred to prioritize testing the rest of the planner before the upcoming
race.

#### Empty teams auto-clean on signup removal, scoped to car class — 2026-08-25
Deleting a `race_event_signups` row now sweeps that event's `race_event_teams`
for any team left with zero members and deletes it — but only within the
removed signup's own `car_class`, so pulling a GTP driver's signup can't
delete an already-empty LMP2/GT3 team from unrelated classes. Went through a
few wrong scopes first: tried triggering the sweep on the team "Leave"
action (wrong — that's not what "signup removed" means), then swept the
whole event regardless of class (too broad — one signup removal wiped every
empty team in the event at once, not just its own class).

#### `race_event_teams.race_event_id` was missing `ON DELETE CASCADE` — 2026-08-25
Unlike `race_event_signups`/`race_event_team_members`, the FK from
`race_event_teams` to `race_events` had no cascade (migration 015 fixes it).
This silently broke the hourly special-events refresh entirely: once any
special event with a team already assigned to it dropped off iRacing's
listing (i.e. it already ran), the cleanup delete threw a foreign-key
violation that aborted `refreshSpecialEvents()` for *every* event, not just
the stuck one — so the whole special-events calendar quietly stopped
updating until this was found and fixed.

#### Relay's raw WebSocket needed its own path — 2026-08-26
`useRelaySocket.js` was hardcoded to `ws://localhost:4000`, which only works
on the Work PC itself — broken for anyone viewing through the Cloudflare
tunnel. Fixed by giving the relay's `WebSocketServer` an explicit
`/ws-relay` path, adding a matching Vite proxy rule (mirroring the existing
`/ws-agent` one), and building the client URL from `window.location` instead
of a hardcoded host. Also worth remembering: the `dashboard` Docker service
doesn't live-sync source the way `relay` does (`develop.watch` only covers
relay) — frontend changes need an explicit container rebuild to take effect,
unlike backend changes which apply immediately.

#### Garage61 (#9): OAuth2 confirmed, app submitted for approval — 2026-08-26
The earlier "not 100% confirmed" caveat on Garage61's consent-flow mechanics
(see the 2026-08-14 note above) is resolved — checked `garage61.net/developer`
directly: it's a standard OAuth2 Authorization Code Grant (PKCE recommended),
distinct from the login use case already ruled out. `GET /api/v1/laps`
(`findLaps`) returns per-lap `lapTime`, `fuelUsed`, `fuelLevel`, and
`sectors[]` under a single `driving_data` scope — covers both lap-time and
fuel-stint data in one endpoint, feeding both issue #9 and the quali-driver
picker stub from migration 020.

Registered a Garage61 developer app ("Pitwall", owned by the M.U.R.D.E.R
Racing team) requesting only the `driving_data` permission with **OAuth2
access token** auth (not personal access token — each driver needs to
individually connect and grant access to their own data, not just the app
owner's). Deliberately left out `analyses` and `team_member_management`
scopes; nothing planned needs them yet, and minimizing scope keeps each
driver's consent screen simpler. Submitted for Garage61's approval; actual
implementation (migration for `murder_drivers` token columns, `relay/garage61.js`
OAuth client via `simple-oauth2`, `/api/garage61/*` routes) is designed but
blocked until Garage61 issues a client ID/secret.
