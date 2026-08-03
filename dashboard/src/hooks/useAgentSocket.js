import { useEffect, useReducer, useRef } from 'react';
import { AGENT_DASHBOARD_WS_URL } from '@/lib/agent';

const RECONNECT_DELAY_MS = 2000;

const initialState = {
  connected: false,
  stint: null,
  fuel: null,
  incidents: [],
  stintHistory: [],
  telemetry: null,
  session: null,
  trackMap: null,
};

function reducer(state, event) {
  switch (event.type) {
    case 'reset':
      return { ...initialState, connected: state.connected };
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
    case 'stintClosed':
      return { ...state, stintHistory: [event.data, ...state.stintHistory] };
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
// The agent multiplexes every connected team's data over one socket
// (tagged { type, team, data }), so this only applies messages for the
// team it was asked to watch — resetting to a clean slate whenever teamId
// changes, since none of the previous team's state is valid for a new one.
export function useAgentSocket(teamId) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const teamIdRef = useRef(teamId);
  teamIdRef.current = teamId;

  useEffect(() => {
    dispatchRef.current({ type: 'reset' });
  }, [teamId]);

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
        if (!msg?.type) return;
        // team === null is a connection-status event, not team data —
        // those apply regardless of which team is being watched.
        if (msg.team != null && msg.team !== teamIdRef.current) return;
        dispatchRef.current(msg);
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
