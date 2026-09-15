require('dotenv').config({ path: __dirname + '/../.env' });

module.exports = {
    // Port the WebSocket server listens on for collector connections.
    // Must match AGENT_PORT in the collector's config.
    port: Number(process.env.AGENT_PORT) || 4100,

    // Port the dashboard connects to for live stint/fuel/incident state.
    dashboardPort: Number(process.env.DASHBOARD_PORT) || 4101,

    databaseUrl: process.env.DATABASE_URL,

    // Used for discord bot implementation:
    discordBotToken: process.env.DISCORD_BOT_TOKEN,
    discordNotifyChannelId: process.env.DISCORD_NOTIFY_CHANNEL_ID,
    discordWarningMinutes: Number(process.env.DISCORD_WARNING_MINUTES) || 10,
    discordWarningLaps: Number(process.env.DISCORD_WARNING_LAPS) || 3,
};
