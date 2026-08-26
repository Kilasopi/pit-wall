import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useAgentSocket } from '@/hooks/useAgentSocket';
import { useRelaySocket } from '@/hooks/useRelaySocket';
import { useTeamSlugs } from '@/hooks/useTeamSlugs';
import { Badge } from '@/components/ui/badge';
import { RELAY_HTTP_URL } from '@/lib/relay';
import { Button } from '@/components/ui/button';

// Only ever rendered on the crew (pitwall) host — the spectate host
// renders SpectateRoot/Spectate.jsx directly with no nav chrome at all.
const links = [
  { to: '/', label: 'Race View' },
  { to: '/drivers', label: 'Drivers' },
  { to: '/races', label: 'Races' },
  { to: '/schedule', label: 'Schedule' },
];

// teamId param is only present on /t/:teamId/* routes — on every other
// page this is undefined, so the team-scoped badges (collector/iRacing
// session) just read as disconnected since no collector has been resolved
// to "this" team. The param itself is a friendly slug (see useTeamSlugs),
// not the agent's real teamId, so it needs the same resolution RaceView
// does before opening its own status socket.
export function NavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { teamId: slugParam } = useParams();
  const { slugToTeamId } = useTeamSlugs();
  const teamId = slugParam ? (slugToTeamId[slugParam] ?? slugParam) : undefined;
  const agent = useAgentSocket(teamId);
  const relay = useRelaySocket();

  const clearSessionHistory = () => {
    if (!confirm('Clear all stint, fuel, and incident history? This cannot be undone.')) return;
    fetch(`${RELAY_HTTP_URL}/api/session-history`, { method: 'DELETE' });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="mb-6 flex flex-col gap-3 border-b pb-3">
      <div className="flex flex-wrap items-center gap-2 self-end">
        <Badge variant={relay.connected ? 'default' : 'destructive'}>
          {relay.connected ? 'Relay Connected' : 'Relay Disconnected'}
        </Badge>
        <Badge variant={agent.connected ? 'default' : 'destructive'}>
          {agent.connected ? 'Agent Connected' : 'Agent Disconnected'}
        </Badge>
        <Badge variant={agent.collectorConnected ? 'default' : 'destructive'}>
          {agent.collectorConnected ? 'Collector Connected' : 'Collector Disconnected'}
        </Badge>
        <Badge variant={agent.inIracingSession ? 'default' : 'destructive'}>
          {agent.inIracingSession ? 'In iRacing Session' : 'Not In iRacing Session'}
        </Badge>
        <Button
          type="button"
          onClick={clearSessionHistory}
          className="rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Clear Session History
        </Button>
        <Button
          type="button"
          onClick={handleLogout}
          className="rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Log Out
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-4">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'text-sm font-medium text-muted-foreground hover:text-foreground',
                pathname === link.to && 'text-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>
    </nav>
  );
}
