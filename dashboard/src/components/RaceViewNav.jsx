import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const links = [
  { to: '', label: 'Live' },
  { to: 'leaderboard', label: 'Leaderboard' },
  { to: 'carinfo', label: 'Car Info' },
  { to: 'trackinfo', label: 'Track Info' },
  { to: 'strategy', label: 'Strategy' },
];

export function RaceViewNav({ teamId }) {
  const { pathname } = useLocation();
  const base = `/t/${encodeURIComponent(teamId)}`;

  return (
    <nav className="mb-6 flex gap-4 border-b pb-3">
      {links.map((link) => {
        const to = link.to ? `${base}/${link.to}` : base;
        return (
          <Link
            key={link.to}
            to={to}
            className={cn(
              'text-sm font-medium text-muted-foreground hover:text-foreground',
              pathname === to && 'text-foreground'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
