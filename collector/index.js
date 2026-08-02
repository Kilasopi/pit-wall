const config = require('./config');
const { IracingReader } = require('./iracing_reader');
const { TelemetrySender } = require('./telemetry_sender');
const { attachCommandReceiver } = require('./command_receiver');

const reader = new IracingReader(config);
const sender = new TelemetrySender(config);

sender.on('connected', () => console.log(`Connected to agent at ${config.agentUrl}`));
sender.on('disconnected', () => console.log('Disconnected from agent, reconnecting...'));
sender.on('error', (err) => console.error('WebSocket error:', err.message));

attachCommandReceiver(sender, (command) => {
    console.log('Received command from agent:', command);
});

reader.on('connected', () => console.log('Connected to iRacing'));
reader.on('disconnected', () => console.log('Waiting for iRacing session...'));
reader.on('telemetry', (values) => sender.sendTelemetry(values));
reader.on('session', (data) => sender.sendSession(data));

sender.connect();
reader.start();

function shutdown() {
    console.log('Shutting down collector...');
    reader.stop();
    sender.close();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
