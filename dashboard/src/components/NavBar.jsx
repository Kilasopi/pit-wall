import { Link, useLocation, useParams } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useAgentSocket } from '@/hooks/useAgentSocket';
import { useRelaySocket } from '@/hooks/useRelaySocket';
import { Badge } from '@/components/ui/badge';

const links = [
  { to: '/', label: 'Race View' },
  { to: '/drivers', label: 'Drivers' },
  { to: '/planner', label: 'Stint Planner' },
];

// teamId is only present on /t/:teamId/* routes — on every other page this
// is undefined, so the team-scoped badges (collector/iRacing session) just
// read as disconnected since no collector has been resolved to "this" team.
export function NavBar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { teamId } = useParams();
  const agent = useAgentSocket(teamId);
  const relay = useRelaySocket();

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
