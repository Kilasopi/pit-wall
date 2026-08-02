const config = require('./config');
const { AgentWebSocketServer } = require('./websocket_server');

const server = new AgentWebSocketServer(config);

server.on('collector-connected', () => console.log('Collector connected'));
server.on('collector-disconnected', () => console.log('Collector disconnected'));
server.on('telemetry', (values) => {
    // TODO: hand off to fuel_calculator / strategy_engine and storage
});
server.on('session', (data) => {
    // TODO: hand off to strategy_engine and storage
});

server.start();
console.log(`Agent WebSocket server listening on ${config.port}`);

function shutdown() {
    console.log('Shutting down agent...');
    server.stop();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
