import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const links = [
  { to: '/', label: 'Live' },
  { to: '/carinfo', label: 'Car Info' },
  { to: '/trackinfo', label: 'Track Info' },
];

export function RaceViewNav() {
  const { pathname } = useLocation();

  return (
    <nav className="mb-6 flex gap-4 border-b pb-3">
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
    </nav>
  );
}
