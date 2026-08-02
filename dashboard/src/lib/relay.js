// Relative by default so requests go through the Vite dev-server proxy
// (see vite.config.js) at whatever origin the page was loaded from, rather
// than assuming relay is reachable at "localhost" — which breaks for
// anyone viewing the dashboard through a tunnel.
export const RELAY_HTTP_URL = import.meta.env.VITE_RELAY_HTTP_URL ?? '';
export const RELAY_WS_URL = import.meta.env.VITE_RELAY_URL ?? 'ws://localhost:4000';
