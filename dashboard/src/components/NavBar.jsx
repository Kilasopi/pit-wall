import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

const links = [
  { to: '/', label: 'Race View' },
  { to: '/drivers', label: 'Drivers' },
  { to: '/planner', label: 'Stint Planner' },
];

export function NavBar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="mb-6 flex items-center justify-between gap-4 border-b pb-3">
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
    </nav>
  );
}
