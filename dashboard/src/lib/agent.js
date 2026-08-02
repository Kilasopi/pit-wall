// Relative to the current page's origin by default, proxied to the agent
// by vite.config.js's /ws-agent rule — so this still works when the
// dashboard is viewed through a tunnel, where "localhost" would resolve
// to the viewer's own machine instead of the Work PC.
function defaultAgentDashboardWsUrl() {
  if (typeof window === 'undefined') return 'ws://localhost:4101';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws-agent`;
}

export const AGENT_DASHBOARD_WS_URL =
  import.meta.env.VITE_AGENT_DASHBOARD_URL ?? defaultAgentDashboardWsUrl();
