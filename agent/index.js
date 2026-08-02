const config = require('./config');
const { AgentWebSocketServer } = require('./websocket_server');
const { DashboardServer } = require('./dashboard_server');
const { FuelCalculator } = require('./fuel_calculator');
const { StrategyEngine } = require('./strategy_engine');
const { createStorage } = require('./storage');
const telemetryDump = require('./telemetry_dump'); // THROWAWAY, see telemetry_dump.js

const server = new AgentWebSocketServer(config);
const dashboard = new DashboardServer(config);
const fuelCalculator = new FuelCalculator();
const strategyEngine = new StrategyEngine();
const storage = config.databaseUrl ? createStorage(config.databaseUrl) : null;

let currentStintId = null;
let lastLapsCompleted = 0;

async function handleSwap({ driver, carNumber, carName }) {
    if (currentStintId !== null && storage) {
        await storage.closeStint(currentStintId, {
            endedAt: new Date(),
            lapsCompleted: lastLapsCompleted,
        });
    }

    lastLapsCompleted = 0;
    dashboard.broadcast('stint', { driver, carNumber, carName, lapsCompleted: 0 });

    if (storage) {
        currentStintId = await storage.openStint({ driver, carNumber, startedAt: new Date() });
    }
}

async function handleLap({ lapsCompletedThisStint }) {
    lastLapsCompleted = lapsCompletedThisStint;
    const { driver, carNumber, carName } = strategyEngine.currentDriver();
    dashboard.broadcast('stint', { driver, carNumber, carName, lapsCompleted: lapsCompletedThisStint });

    if (storage && currentStintId !== null) {
        await storage.updateStintLaps(currentStintId, lapsCompletedThisStint);
    }
}

async function handleIncident({ points, lap }) {
    const description = `${points}x incident${lap != null ? ` on lap ${lap}` : ''}`;
    dashboard.broadcast('incident', { lap, description, points });

    if (storage) {
        await storage.insertIncident({ lap, description, points });
    }
}

server.on('collector-connected', () => console.log('Collector connected'));
server.on('collector-disconnected', () => console.log('Collector disconnected'));

server.on('session', (data) => {
    telemetryDump.dump('session', data); // THROWAWAY
    strategyEngine.ingestSession(data);
});

server.on('telemetry', (values) => {
    telemetryDump.dump('telemetry', values); // THROWAWAY

    // Raw feed, broadcast as-is alongside the derived stint/fuel/incident
    // messages — a hook for building new functionality against the full
    // telemetry stream without touching strategy_engine/fuel_calculator.
    dashboard.broadcast('telemetry', values);

    for (const event of strategyEngine.ingestTelemetry(values)) {
        if (event.type === 'swap') handleSwap(event).catch(console.error);
        if (event.type === 'lap') handleLap(event).catch(console.error);
        if (event.type === 'incident') handleIncident(event).catch(console.error);
    }

    const fuelEstimate = fuelCalculator.ingest(values);
    if (fuelEstimate) {
        dashboard.broadcast('fuel', fuelEstimate);
        if (storage) {
            storage
                .insertFuelReading({ stintId: currentStintId, ...fuelEstimate })
                .catch(console.error);
        }
    }
});

server.start();
dashboard.start();
console.log(`Agent WebSocket server listening on ${config.port}`);
console.log(`Dashboard broadcast listening on ${config.dashboardPort}`);
if (!storage) {
    console.log('DATABASE_URL not set — running without persistence');
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
