// Receives commands sent back from the agent (Work PC) over the same
// WebSocket connection telemetry is sent out on.
const { parseMessage, MESSAGE_TYPES } = require('../shared/telemetry_schema');

function attachCommandReceiver(sender, onCommand) {
    sender.on('message', (raw) => {
        let message;
        try {
            message = parseMessage(raw);
        } catch (err) {
            return;
        }

        if (message.type === MESSAGE_TYPES.COMMAND) {
            onCommand(message.payload);
        }
    });
}

module.exports = { attachCommandReceiver };
