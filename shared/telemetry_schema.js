// Wire format shared between collector (Sim PC) and agent (Work PC).

const MESSAGE_TYPES = {
    TELEMETRY: 'telemetry',
    SESSION: 'session',
    COMMAND: 'command',
    IRACING_STATUS: 'iracingStatus',
};

function createMessage(type, payload) {
    return { type, timestamp: Date.now(), payload };
}

function parseMessage(raw) {
    const message = JSON.parse(raw);
    if (!message || typeof message.type !== 'string') {
        throw new Error('Invalid message: missing "type"');
    }
    return message;
}

module.exports = { MESSAGE_TYPES, createMessage, parseMessage };
