const config = require('./config');
const { IracingReader } = require('./iracing_reader');
const { TelemetrySender } = require('./telemetry_sender');
const { attachCommandReceiver } = require('./command_receiver');

const reader = new IracingReader(config);
const sender = new TelemetrySender(config);

// The very first iRacing status can be known before the agent socket
// finishes connecting (e.g. iRacing is already running when the collector
// restarts), and TelemetrySender.send() silently drops anything sent while
// the socket isn't OPEN yet — with no queue or resend. Track the latest
// known status here and resend it whenever the agent connection (re)opens
// so it can't be lost to that race.
let iracingConnected = false;

sender.on('connected', () => {
    console.log(`Connected to agent at ${config.agentUrl}`);
    sender.sendIracingStatus(iracingConnected);
    if (config.teamOverride) {
        console.log(`Pinning this connection to team "${config.teamOverride}"`);
        sender.sendHello(config.teamOverride);
    }
});
sender.on('disconnected', () => console.log('Disconnected from agent, reconnecting...'));
sender.on('error', (err) => console.error('WebSocket error:', err.message));

attachCommandReceiver(sender, (command) => {
    console.log('Received command from agent:', command);
});

reader.on('connected', () => {
    console.log('Connected to iRacing');
    iracingConnected = true;
    sender.sendIracingStatus(true);
});
reader.on('disconnected', () => {
    console.log('Waiting for iRacing session...');
    iracingConnected = false;
    sender.sendIracingStatus(false);
});
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
