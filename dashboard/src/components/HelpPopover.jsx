import { useState } from 'react';
import { CircleQuestionMark } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HelpPopover({ label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
      >
        <CircleQuestionMark className="size-4" />
      </Button>
      {open && (
        <div className="absolute top-full left-0 z-10 mt-2 w-72 rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md">
          {children}
        </div>
      )}
    </div>
  );
}
