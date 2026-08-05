import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

// The teamId (e.g. "car-29") stays the actual routing/DB identity — this
// is just the human-facing label, defaulting to the track name (set
// agent-side) until renamed here.
export function PitwallTitle({ teamId, displayName, renamePitwall }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const label = displayName ?? teamId;

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-heading font-medium">Pit Wall — {label}</h1>
        <button
          type="button"
          onClick={() => {
            setDraft(displayName ?? '');
            setEditing(true);
          }}
          aria-label="Rename pitwall"
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
      </div>
    );
  }

  function save() {
    renamePitwall?.(draft.trim());
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xl font-heading font-medium">Pit Wall —</span>
      <Input
        autoFocus
        value={draft}
        placeholder={teamId}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="h-8 max-w-64"
      />
      <button
        type="button"
        onClick={save}
        aria-label="Save name"
        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Check className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        aria-label="Cancel"
        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
