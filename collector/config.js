require('dotenv').config({ path: __dirname + '/.env' });

const agentHost = process.env.AGENT_HOST || 'localhost';
const agentPort = Number(process.env.AGENT_PORT) || 4100;

module.exports = {
    agentHost,
    agentPort,
    agentUrl: `ws://${agentHost}:${agentPort}`,

    // Set on a rig that's only ever spectating (not racing a real roster
    // entry) so the agent always buckets it under this fixed team instead
    // of resolving by whichever car the camera happens to be on — car
    // number changes every time the camera moves, so that resolution never
    // lands anywhere stable for a pure spectator.
    teamOverride: process.env.TEAM_OVERRIDE || null,

    // How often to poll the SDK for a new telemetry/session tick.
    telemetryPollRateMs: Number(process.env.TELEMETRY_POLL_RATE_MS) || Math.round(1000 / 60),
    sessionPollRateMs: Number(process.env.SESSION_POLL_RATE_MS) || 1000,

    reconnect: {
        initialDelayMs: Number(process.env.RECONNECT_INITIAL_DELAY_MS) || 1000,
        maxDelayMs: Number(process.env.RECONNECT_MAX_DELAY_MS) || 30000,
        backoffMultiplier: Number(process.env.RECONNECT_BACKOFF_MULTIPLIER) || 2,
    },
};
