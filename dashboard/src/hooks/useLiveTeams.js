import { useEffect, useReducer, useRef } from 'react';
import { AGENT_DASHBOARD_WS_URL } from '@/lib/agent';

const RECONNECT_DELAY_MS = 2000;

// { [teamId]: { collectorConnected, iracingConnected, session, stint, displayName } }
const initialState = {};

function reducer(state, event) {
  if (event.type === 'reset') return initialState;
  // team === null events (bare connection status) aren't about any
  // specific pitwall — nothing to key a card off of, ignore them here.
  if (event.team == null) return state;

  const existing = state[event.team] ?? {
    collectorConnected: false,
    iracingConnected: false,
    session: null,
    stint: null,
    displayName: null,
  };

  switch (event.type) {
    case 'collector':
      return { ...state, [event.team]: { ...existing, collectorConnected: event.data } };
    case 'iracingSession':
      return { ...state, [event.team]: { ...existing, iracingConnected: event.data } };
    case 'session':
      return { ...state, [event.team]: { ...existing, session: event.data } };
    case 'stint':
      return { ...state, [event.team]: { ...existing, stint: event.data } };
    case 'displayName':
      return { ...state, [event.team]: { ...existing, displayName: event.data } };
    default:
      return state;
  }
}

// Which pitwalls currently exist — driven entirely by which collectors are
// connected (agent/index.js auto-creates team state the moment a collector
// resolves), not by the entry_drivers roster. A team disappears from this
// list once its collector disconnects and it's dropped from the agent's
// replay-on-connect state.
export function useLiveTeams() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    let ws;
    let reconnectTimer;
    let cancelled = false;

    function connect() {
      ws = new WebSocket(AGENT_DASHBOARD_WS_URL);

      ws.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!msg?.type) return;
        dispatchRef.current(msg);
      };

      ws.onclose = () => {
        dispatchRef.current({ type: 'reset' });
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
