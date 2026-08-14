import { useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { useDrivers } from '@/hooks/useDrivers';
import { RELAY_HTTP_URL } from '@/lib/relay';
import { AddRosterDriverForm } from '@/components/AddRosterDriverForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RegisteredRaces } from '@/components/RegisteredRaces';
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

function DriversPage() {
  return (

    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-heading font-medium">Team M.U.R.D.E.R</h1>
      </div>
      <NavBar />

      <div className="grid items-start gap-4 md:grid-cols-2">
        <RosterDriversCard />
        <RegisteredRaces />
      </div>
    </div>
  );
}

export default DriversPage;
