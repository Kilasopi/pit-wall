require('dotenv').config({ path: __dirname + '/.env' });

module.exports = {
    // Port the WebSocket server listens on for collector connections.
    // Must match AGENT_PORT in the collector's config.
    port: Number(process.env.AGENT_PORT) || 4100,
};
