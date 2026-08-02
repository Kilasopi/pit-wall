import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { ColorSwatch } from '@/components/ColorSwatch';

const SECTIONS = [
  {
    title: 'General',
    variables: [
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--popover',
      '--popover-foreground',
    ],
  },
  {
    title: 'Actions',
    variables: [
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--accent',
      '--accent-foreground',
      '--destructive',
    ],
  },
  {
    title: 'Muted and borders',
    variables: ['--muted', '--muted-foreground', '--border', '--input', '--ring'],
  },
  {
    title: 'Charts',
    variables: ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'],
  },
  {
    title: 'Sidebar',
    variables: [
      '--sidebar',
      '--sidebar-foreground',
      '--sidebar-primary',
      '--sidebar-primary-foreground',
      '--sidebar-accent',
      '--sidebar-accent-foreground',
      '--sidebar-border',
      '--sidebar-ring',
    ],
  },
];

export function ThemePalette({ label, themeClassName }) {
  const containerRef = useRef(null);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex-1 rounded-lg border border-border bg-background p-4 text-foreground',
        themeClassName,
      )}
    >
      <h2 className="mb-4 font-heading text-lg font-medium">{label}</h2>
      <div className="flex flex-col gap-6">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">{section.title}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {section.variables.map((name) => (
                <ColorSwatch key={name} name={name} containerRef={containerRef} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
