import { useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { useDrivers } from '@/hooks/useDrivers';
import { RELAY_HTTP_URL } from '@/lib/relay';
import { AddEntryDriverForm } from '@/components/AddEntryDriverForm';
import { AddRosterDriverForm } from '@/components/AddRosterDriverForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

function dedupeEntries(rows) {
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const driverKey = row.is_guest ? `guest:${row.guest_name}` : `roster:${row.driver_id}`;
    const key = `${row.event_name}|||${row.entry_name}|||${driverKey}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  }
  return result;
}

function DriversTable({ endpoint, title, description, columns, onClear, headerAction, transform }) {
  const { data: rawData, loading, error } = useDrivers(endpoint);
  const data = transform ? transform(rawData) : rawData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {error ? `Failed to load: ${error}` : `${data.length} driver${data.length === 1 ? '' : 's'}`}
        </CardDescription>
        {(headerAction || (onClear && data.length > 0)) && (
          <CardAction className="flex gap-2">
            {headerAction}
            {onClear && data.length > 0 && (
              <Button variant="outline" size="sm" onClick={onClear}>
                Clear
              </Button>
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drivers yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>{col.render ? col.render(row) : row[col.key]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RosterDriversCard() {
  // null = hidden, 'new' = add form, a driver object = editing that driver
  const [formTarget, setFormTarget] = useState(null);

  function removeDriver(id, name) {
    if (!confirm(`Remove ${name} from the roster?`)) return;
    fetch(`${RELAY_HTTP_URL}/api/murder-drivers/${id}`, { method: 'DELETE' })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          alert(body.error ?? `Failed to remove driver (${res.status})`);
        }
      })
      .catch(() => alert('Failed to remove driver'));
  }

  return (
    <div className="flex flex-col gap-4">
      <DriversTable
        endpoint="murder-drivers"
        title="MURDER Drivers"
        description="Team roster"
        headerAction={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFormTarget((v) => (v ? null : 'new'))}
          >
            {formTarget ? 'Cancel' : 'Add Driver'}
          </Button>
        }
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'nickname', label: 'Nickname', render: (r) => r.nickname ?? '—' },
          { key: 'iracing_id', label: 'iRacing ID', render: (r) => r.iracing_id ?? '—' },
          {
            key: 'timezone',
            label: 'Local time',
            render: (r) => {
              if (!r.timezone) return '—';
              try {
                const time = new Intl.DateTimeFormat(undefined, {
                  timeZone: r.timezone,
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date());
                return `${time} (${r.city ?? r.timezone})`;
              } catch {
                return r.timezone;
              }
            },
          },
          {
            key: 'active',
            label: 'Status',
            render: (r) => (
              <Badge variant={r.active ? 'default' : 'outline'}>
                {r.active ? 'Active' : 'Inactive'}
              </Badge>
            ),
          },
          {
            key: 'actions',
            label: '',
            render: (r) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setFormTarget(r)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeDriver(r.id, r.name)}>
                  Remove
                </Button>
              </div>
            ),
          },
        ]}
      />

      {formTarget && (
        <AddRosterDriverForm
          driver={formTarget === 'new' ? null : formTarget}
          onAdded={() => setFormTarget(null)}
          onCancel={() => setFormTarget(null)}
        />
      )}
    </div>
  );
}

function CarNumberCell({ row }) {
  const [value, setValue] = useState(row.car_number ?? '');
  const [saving, setSaving] = useState(false);

  function save() {
    const trimmed = value.trim();
    if (trimmed === (row.car_number ?? '')) return;
    setSaving(true);
    fetch(`${RELAY_HTTP_URL}/api/entry-drivers/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carNumber: trimmed || null }),
    })
      .catch(() => alert('Failed to update car number'))
      .finally(() => setSaving(false));
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      disabled={saving}
      placeholder="—"
      className="w-16 rounded border border-input bg-transparent px-1.5 py-0.5 text-sm"
    />
  );
}

function EntryDriversCard() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <DriversTable
        endpoint="entry-drivers"
        title="Entry Drivers"
        description="Cleared when the event finishes"
        transform={dedupeEntries}
        onClear={() => {
          if (!confirm('Clear all entry drivers?')) return;
          fetch(`${RELAY_HTTP_URL}/api/entry-drivers`, { method: 'DELETE' });
        }}
        headerAction={
          <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'Add Driver'}
          </Button>
        }
        columns={[
          { key: 'driver_name', label: 'Name' },
          { key: 'event_name', label: 'Event' },
          { key: 'entry_name', label: 'Entry' },
          { key: 'car_number', label: 'Car #', render: (r) => <CarNumberCell row={r} /> },
          { key: 'car_type', label: 'Car Type', render: (r) => r.car_type ?? '—' },
          {
            key: 'is_guest',
            label: 'Type',
            render: (r) => (
              <Badge variant={r.is_guest ? 'secondary' : 'outline'}>
                {r.is_guest ? 'Guest' : 'Roster'}
              </Badge>
            ),
          },
        ]}
      />

      {showForm && <AddEntryDriverForm onAdded={() => setShowForm(false)} />}
    </div>
  );
}

// Sets up a car #0 "Spectating" roster driver + entry in one click, so
// there's something for the agent's car-number roster lookup to resolve to
// when the Sim PC is just spectating rather than driving a real team's
// entry (see agent/index.js resolveTeamId). Idempotent — re-clicking finds
// and reuses the existing "Spectating" driver/entry instead of piling up
// duplicates.
function QuickStartButton() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function quickStart() {
    setSubmitting(true);
    setError(null);

    try {
      const rosterRes = await fetch(`${RELAY_HTTP_URL}/api/murder-drivers`);
      if (!rosterRes.ok) throw new Error(`${rosterRes.status} ${rosterRes.statusText}`);
      const roster = await rosterRes.json();
      let driver = roster.find((d) => d.name === 'Spectating');

      if (!driver) {
        const createRes = await fetch(`${RELAY_HTTP_URL}/api/murder-drivers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Spectating' }),
        });
        if (!createRes.ok) throw new Error(`${createRes.status} ${createRes.statusText}`);
        driver = await createRes.json();
      }

      const entriesRes = await fetch(`${RELAY_HTTP_URL}/api/entry-drivers`);
      if (!entriesRes.ok) throw new Error(`${entriesRes.status} ${entriesRes.statusText}`);
      const entries = await entriesRes.json();
      const alreadyExists = entries.some(
        (e) =>
          e.event_name === 'Spectating' && e.entry_name === 'Spectating' && e.driver_id === driver.id
      );

      if (!alreadyExists) {
        const entryRes = await fetch(`${RELAY_HTTP_URL}/api/entry-drivers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId: driver.id,
            guestName: null,
            eventName: 'Spectating',
            entryName: 'Spectating',
            carNumber: '0',
            carType: null,
          }),
        });
        if (!entryRes.ok) throw new Error(`${entryRes.status} ${entryRes.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick start failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        onClick={quickStart}
        disabled={submitting}
        title="Creates a car #0 'Spectating' driver and entry so the pit wall has something to resolve to while just watching"
      >
        {submitting ? 'Setting up…' : 'Quick Start'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function DriversPage() {
  return (

    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-heading font-medium">Team M.U.R.D.E.R</h1>
        <QuickStartButton />
      </div>
      <NavBar />

      <div className="grid items-start gap-4 md:grid-cols-2">
        <RosterDriversCard />
        <EntryDriversCard />
      </div>
    </div>
  );
}

export default DriversPage;
