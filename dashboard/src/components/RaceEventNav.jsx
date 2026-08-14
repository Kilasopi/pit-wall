import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const links = [
  { to: 'racePlanner', label: 'Race Planner' },
  { to: 'stintPlanner', label: 'Stint Planner' },
];

export function RaceEventNav({ raceEventId }) {
  const { pathname } = useLocation();
  const base = `/races/${raceEventId}`;

  return (
    <nav className="mb-6 flex gap-4 border-b pb-3">
      {links.map((link) => {
        const to = `${base}/${link.to}`;
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
