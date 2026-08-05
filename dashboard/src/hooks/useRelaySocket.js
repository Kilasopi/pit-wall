import { useEffect, useReducer, useRef } from 'react';
import { RELAY_WS_URL } from '@/lib/relay';

const RECONNECT_DELAY_MS = 2000;

const initialState = {
  connected: false,
  stint: null,
  fuel: null,
  incidents: [],
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
    case 'incidentsSnapshot':
      return { ...state, incidents: [...event.data].reverse() };
    default:
      return state;
  }
}

export function useRelaySocket() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    let ws;
    let reconnectTimer;
    let cancelled = false;

    function connect() {
      ws = new WebSocket(RELAY_WS_URL);

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
