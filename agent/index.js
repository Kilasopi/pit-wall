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
            dashboard.broadcast('trackmap', { trackId, path: svgPath }, teamId);
        } else {
            console.log(`No track map asset found for trackId ${trackId}`);
        }
    } catch (err) {
        console.error('Failed to fetch track map:', err.message);
    }
}

async function handleSwap(teamId, team, { driver, carNumber, carName }) {
    const endedAt = new Date();

    if (team.currentStintSummary) {
        dashboard.broadcast(
            'stintClosed',
            { ...team.currentStintSummary, endedAt, lapsCompleted: team.lastLapsCompleted },
            teamId
        );
    }

    if (team.currentStintId !== null && storage) {
        await storage.closeStint(team.currentStintId, {
            endedAt,
            lapsCompleted: team.lastLapsCompleted,
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
    connections.set(ws, { teamId: null, latestSession: null, resolving: false });
    console.log('Collector connected');
});

server.on('collector-disconnected', (ws) => {
    connections.delete(ws);
    console.log('Collector disconnected');
});

server.on('session', (data, ws) => {
    const connState = connections.get(ws);
    if (!connState) return;
    connState.latestSession = data;

    if (connState.teamId) {
        const team = getOrCreateTeam(connState.teamId);
        team.strategyEngine.ingestSession(data);
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
                    team.strategyEngine.ingestSession(connState.latestSession);
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
