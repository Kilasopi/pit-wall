import { useEffect, useReducer, useRef } from 'react';
import { AGENT_DASHBOARD_WS_URL } from '@/lib/agent';

const RECONNECT_DELAY_MS = 2000;

const initialState = {
  connected: false,
  stint: null,
  fuel: null,
  incidents: [],
  telemetry: null,
  session: null,
  trackMap: null,
};

function reducer(state, event) {
  switch (event.type) {
    case 'connected':
      return { ...state, connected: true };
    case 'disconnected':
      return { ...state, connected: false };
    case 'stint':
      return { ...state, stint: event.data };
    case 'fuel':
      return { ...state, fuel: event.data };
    case 'incident':
      return { ...state, incidents: [event.data, ...state.incidents] };
    case 'telemetry':
      return { ...state, telemetry: event.data };
    case 'session':
      return { ...state, session: event.data };
    case 'trackmap':
      return { ...state, trackMap: event.data };

    default:
      return state;
  }
}

// Live stint/fuel/incident state broadcast by agent/dashboard_server.js.
// Same message shape as useRelaySocket, which this replaces for the
// dashboard's live-telemetry view (relay still serves roster/planning data).
export function useAgentSocket() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    let ws;
    let reconnectTimer;
    let cancelled = false;

    function connect() {
      ws = new WebSocket(AGENT_DASHBOARD_WS_URL);

      ws.onopen = () => dispatchRef.current({ type: 'connected' });

      ws.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg?.type) dispatchRef.current(msg);
      };

      ws.onclose = () => {
        dispatchRef.current({ type: 'disconnected' });
        if (!cancelled) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  return state;
}
