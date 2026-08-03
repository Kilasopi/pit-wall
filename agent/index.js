const config = require('./config');
const { AgentWebSocketServer } = require('./websocket_server');
const { DashboardServer } = require('./dashboard_server');
const { FuelCalculator } = require('./fuel_calculator');
const { StrategyEngine } = require('./strategy_engine');
const { createStorage } = require('./storage');
const { TrackMapService } = require('./track_map_service');

const server = new AgentWebSocketServer(config);
const dashboard = new DashboardServer(config);
const storage = config.databaseUrl ? createStorage(config.databaseUrl) : null;
const trackMapService = new TrackMapService(config);

// 100ms (10Hz) — most telemetry-driven UI doesn't need this fast, but the
// track map's car dots visibly snap between positions at anything looser.
const TELEMETRY_BROADCAST_INTERVAL_MS = 100;

// Any number of collectors (Sim PCs) can be connected at once, one per
// team. `connections` tracks each raw websocket while its team identity is
// still unknown; `teams` holds the actual per-team state (own strategy
// engine, fuel calculator, current stint, track map cache) once resolved.
// Nothing here is keyed by a manually-configured team name — see
// resolveTeamId below.
const connections = new Map(); // ws -> { teamId, latestSession, resolving }
const teams = new Map(); // teamId -> team state

function getOrCreateTeam(teamId) {
    if (!teams.has(teamId)) {
        teams.set(teamId, {
            strategyEngine: new StrategyEngine(),
            fuelCalculator: new FuelCalculator(),
            currentStintId: null,
            currentStintSummary: null,
            lastLapsCompleted: 0,
            lastTelemetryBroadcastAt: 0,
            lastTrackMapId: null,
            lastTrackMapPath: null,
            lastSession: null,
            lastTelemetry: null,
            lastFuelEstimate: null,
            collectorConnected: false,
            iracingConnected: false,
        });
    }
    return teams.get(teamId);
}

// Figures out which roster entry a connection belongs to by looking up the
// car number of whatever car it's watching against entry_drivers — no
// per-Sim-PC config needed. Falls back to a car-number-keyed bucket if
// there's no roster match (e.g. testing) or no database configured, so
// teams still stay isolated from each other either way.
async function resolveTeamId(sessionData, values) {
    const carIdx = values?.CamCarIdx;
    const drivers = sessionData?.DriverInfo?.Drivers;
    const info =
        Array.isArray(drivers) && typeof carIdx === 'number'
            ? drivers.find((d) => d.CarIdx === carIdx)
            : null;

    const carNumber =
        info?.CarNumber ?? (info?.CarNumberRaw != null ? String(info.CarNumberRaw) : null);
    if (!carNumber) return null;

    if (storage) {
        try {
            const entryName = await storage.findEntryNameByCarNumber(carNumber);
            if (entryName) return entryName;
        } catch (err) {
            console.error('Failed to resolve entry name from roster:', err.message);
        }
    }

    return `car-${carNumber}`;
}

async function handleTrackMap(teamId, trackId) {
    const team = getOrCreateTeam(teamId);
    if (trackId == null || trackId === team.lastTrackMapId) return;
    team.lastTrackMapId = trackId;

    try {
        console.log(`Fetching track map for trackId ${trackId} (team ${teamId})...`);
        const svgPath = await trackMapService.getTrackPath(trackId);
        if (svgPath) {
            console.log(`Track map fetched for trackId ${trackId} (${svgPath.length} chars)`);
            team.lastTrackMapPath = svgPath;
            dashboard.broadcast('trackmap', { trackId, path: svgPath }, teamId);
        } else {
            console.log(`No track map asset found for trackId ${trackId}`);
        }
    } catch (err) {
        console.error('Failed to fetch track map:', err.message);
    }
}

async function handleSwap(teamId, team, { driver, carNumber, carName, previousSettings }) {
    const endedAt = new Date();

    if (team.currentStintSummary) {
        dashboard.broadcast(
            'stintClosed',
            {
                ...team.currentStintSummary,
                endedAt,
                lapsCompleted: team.lastLapsCompleted,
                settings: previousSettings ?? null,
            },
            teamId
        );
    }

    if (team.currentStintId !== null && storage) {
        await storage.closeStint(team.currentStintId, {
            endedAt,
            lapsCompleted: team.lastLapsCompleted,
            settingsSnapshot: previousSettings ?? null,
        });
    }

    team.lastLapsCompleted = 0;
    team.currentStintSummary = { driver, carNumber, carName, startedAt: endedAt };
    dashboard.broadcast('stint', { driver, carNumber, carName, lapsCompleted: 0 }, teamId);

    if (storage) {
        team.currentStintId = await storage.openStint({
            driver,
            carNumber,
            entryName: teamId,
            startedAt: endedAt,
        });
    }
}

async function handleLap(teamId, team, { lapsCompletedThisStint }) {
    team.lastLapsCompleted = lapsCompletedThisStint;
    const { driver, carNumber, carName } = team.strategyEngine.currentDriver();
    dashboard.broadcast(
        'stint',
        { driver, carNumber, carName, lapsCompleted: lapsCompletedThisStint },
        teamId
    );

    if (storage && team.currentStintId !== null) {
        await storage.updateStintLaps(team.currentStintId, lapsCompletedThisStint);
    }
}

async function handleIncident(teamId, { points, lap }) {
    const description = `${points}x incident${lap != null ? ` on lap ${lap}` : ''}`;
    dashboard.broadcast('incident', { lap, description, points }, teamId);

    if (storage) {
        await storage.insertIncident({ entryName: teamId, lap, description, points });
    }
}

server.on('collector-connected', (ws) => {
    connections.set(ws, { teamId: null, latestSession: null, resolving: false, iracingConnected: false });
    console.log('Collector connected');
});

server.on('collector-disconnected', (ws) => {
    const connState = connections.get(ws);
    if (connState?.teamId) {
        getOrCreateTeam(connState.teamId).collectorConnected = false;
        dashboard.broadcast('collector', false, connState.teamId);
    }
    connections.delete(ws);
    console.log('Collector disconnected');
});

server.on('iracing-status', ({ connected }, ws) => {
    const connState = connections.get(ws);
    if (!connState) return;
    connState.iracingConnected = connected;
    if (connState.teamId) {
        getOrCreateTeam(connState.teamId).iracingConnected = connected;
        dashboard.broadcast('iracingSession', connected, connState.teamId);
    }
});

// Lets a spectator-only rig pin itself to a fixed team id up front instead
// of going through resolveTeamId, which buckets by whichever real car the
// camera happens to be on — that's fine for an actual entry, but useless
// for a rig that's just watching a race to test the app, since the camera
// (and therefore the resolved car number) can change constantly.
server.on('hello', ({ teamOverride }, ws) => {
    const connState = connections.get(ws);
    if (!connState || !teamOverride || connState.teamId) return;

    connState.teamId = teamOverride;
    console.log(`Collector pinned to team "${teamOverride}"`);

    const team = getOrCreateTeam(teamOverride);
    team.collectorConnected = true;
    team.iracingConnected = connState.iracingConnected;
    dashboard.broadcast('collector', true, teamOverride);
    dashboard.broadcast('iracingSession', connState.iracingConnected, teamOverride);

    if (connState.latestSession) {
        team.strategyEngine.ingestSession(connState.latestSession);
        team.lastSession = connState.latestSession;
        dashboard.broadcast('session', connState.latestSession, teamOverride);
        handleTrackMap(teamOverride, connState.latestSession?.WeekendInfo?.TrackID);
    }
});

// A dashboard tab connecting now (including a refresh) missed every
// broadcast that already happened — telemetry/session/fuel/stint only
// ever go out when they change or on their own poll cadence, never
// replayed — so a fresh tab would otherwise sit on "no data yet" until
// the next natural update (which for session/fuel/stint can be seconds
// to minutes away). Replay the last known value per team instead. This
// is all cached state already held for other reasons (strategy engine,
// track map dedup, etc.) — no extra telemetry reads from iRacing.
dashboard.on('connection', (ws) => {
    for (const [teamId, team] of teams) {
        dashboard.sendTo(ws, 'collector', team.collectorConnected, teamId);
        dashboard.sendTo(ws, 'iracingSession', team.iracingConnected, teamId);
        if (team.lastSession) dashboard.sendTo(ws, 'session', team.lastSession, teamId);
        if (team.lastTelemetry) dashboard.sendTo(ws, 'telemetry', team.lastTelemetry, teamId);
        if (team.lastFuelEstimate) dashboard.sendTo(ws, 'fuel', team.lastFuelEstimate, teamId);
        if (team.lastTrackMapId != null) {
            dashboard.sendTo(
                ws,
                'trackmap',
                { trackId: team.lastTrackMapId, path: team.lastTrackMapPath },
                teamId
            );
        }
        if (team.currentStintSummary) {
            dashboard.sendTo(
                ws,
                'stint',
                { ...team.currentStintSummary, lapsCompleted: team.lastLapsCompleted },
                teamId
            );
        }
    }
});

server.on('session', (data, ws) => {
    const connState = connections.get(ws);
    if (!connState) return;
    connState.latestSession = data;

    if (connState.teamId) {
        const team = getOrCreateTeam(connState.teamId);
        team.strategyEngine.ingestSession(data);
        team.lastSession = data;
        dashboard.broadcast('session', data, connState.teamId);
        handleTrackMap(connState.teamId, data?.WeekendInfo?.TrackID);
    }
    // If the team isn't resolved yet, session data is cached above and
    // resolution is attempted on the next telemetry tick — resolving needs
    // CamCarIdx, which only comes from telemetry.
});

server.on('telemetry', (values, ws) => {
    const connState = connections.get(ws);
    if (!connState) return;

    if (!connState.teamId) {
        if (connState.latestSession && !connState.resolving) {
            connState.resolving = true;
            resolveTeamId(connState.latestSession, values)
                .then((teamId) => {
                    connState.resolving = false;
                    if (!teamId) return;

                    connState.teamId = teamId;
                    console.log(`Resolved collector to team "${teamId}"`);

                    const team = getOrCreateTeam(teamId);
                    team.collectorConnected = true;
                    team.iracingConnected = connState.iracingConnected;
                    dashboard.broadcast('collector', true, teamId);
                    dashboard.broadcast('iracingSession', connState.iracingConnected, teamId);

                    team.strategyEngine.ingestSession(connState.latestSession);
                    team.lastSession = connState.latestSession;
                    dashboard.broadcast('session', connState.latestSession, teamId);
                    handleTrackMap(teamId, connState.latestSession?.WeekendInfo?.TrackID);
                })
                .catch((err) => {
                    connState.resolving = false;
                    console.error('Team resolution failed:', err.message);
                });
        }
        return; // drop telemetry until this connection's team is known
    }

    const teamId = connState.teamId;
    const team = getOrCreateTeam(teamId);

    // Raw feed, broadcast as-is alongside the derived stint/fuel/incident
    // messages — a hook for building new functionality against the full
    // telemetry stream without touching strategy_engine/fuel_calculator.
    // Throttled: telemetry arrives at ~60Hz, but every dashboard tab
    // re-renders on each broadcast — nothing here needs updating faster
    // than a human can read it.
    team.lastTelemetry = values;
    const now = Date.now();
    if (now - team.lastTelemetryBroadcastAt >= TELEMETRY_BROADCAST_INTERVAL_MS) {
        team.lastTelemetryBroadcastAt = now;
        dashboard.broadcast('telemetry', values, teamId);
    }

    for (const event of team.strategyEngine.ingestTelemetry(values)) {
        if (event.type === 'swap') handleSwap(teamId, team, event).catch(console.error);
        if (event.type === 'lap') handleLap(teamId, team, event).catch(console.error);
        if (event.type === 'incident') handleIncident(teamId, event).catch(console.error);
    }

    const fuelEstimate = team.fuelCalculator.ingest(values);
    if (fuelEstimate) {
        team.lastFuelEstimate = fuelEstimate;
        dashboard.broadcast('fuel', fuelEstimate, teamId);
        if (storage) {
            storage
                .insertFuelReading({ stintId: team.currentStintId, entryName: teamId, ...fuelEstimate })
                .catch(console.error);
        }
    }
});

server.start();
dashboard.start();
console.log(`Agent WebSocket server listening on ${config.port}`);
console.log(`Dashboard broadcast listening on ${config.dashboardPort}`);
if (!storage) {
    console.log('DATABASE_URL not set — running without persistence or roster-based team resolution');
}

function shutdown() {
    console.log('Shutting down agent...');
    server.stop();
    dashboard.stop();
    if (storage) storage.close();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
