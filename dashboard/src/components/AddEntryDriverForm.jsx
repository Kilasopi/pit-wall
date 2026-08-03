import { useState } from 'react';
import { useDrivers } from '@/hooks/useDrivers';
import { useSpecialEvents } from '@/hooks/useSpecialEvents';
import { RELAY_HTTP_URL } from '@/lib/relay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CAR_TYPES } from '@/lib/carTypes';

const CUSTOM_EVENT = '__custom__';

export function AddEntryDriverForm({ onAdded }) {
  const { data: roster } = useDrivers('murder-drivers');
  const specialEvents = useSpecialEvents();
  const [mode, setMode] = useState('roster'); // 'roster' | 'guest'
  const [selectedIds, setSelectedIds] = useState([]);
  const [guestName, setGuestName] = useState('');
  const [eventChoice, setEventChoice] = useState('');
  const [customEventName, setCustomEventName] = useState('');
  const [entryName, setEntryName] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [carType, setCarType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const eventName = eventChoice === CUSTOM_EVENT ? customEventName.trim() : eventChoice;

  const isValid =
    eventName &&
    entryName.trim() &&
    (mode === 'roster' ? selectedIds.length > 0 : guestName.trim());

  function toggleDriver(id, checked) {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((existing) => existing !== id)
    );
  }

  async function postEntry(body) {
    const res = await fetch(`${RELAY_HTTP_URL}/api/entry-drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setError(null);

    const shared = {
      eventName,
      entryName: entryName.trim(),
      carNumber: carNumber.trim() || null,
      carType: carType || null,
    };

    try {
      if (mode === 'roster') {
        // one entry_drivers row per checked driver, all sharing the same event/entry/car
        await Promise.all(
          selectedIds.map((driverId) =>
            postEntry({ ...shared, driverId, guestName: null })
          )
        );
        setSelectedIds([]);
      } else {
        await postEntry({ ...shared, driverId: null, guestName: guestName.trim() });
        setGuestName('');
      }

      onAdded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Entry Driver</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'roster' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('roster')}
            >
              Roster
            </Button>
            <Button
              type="button"
              variant={mode === 'guest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('guest')}
            >
              Guest
            </Button>
          </div>

          {mode === 'roster' ? (
            <div className="flex flex-col gap-1.5">
              <Label>Drivers</Label>
              {roster.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roster drivers yet</p>
              ) : (
                <div className="flex flex-col gap-2 rounded-lg border border-input p-2.5">
                  {roster.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedIds.includes(d.id)}
                        onCheckedChange={(checked) => toggleDriver(d.id, checked)}
                      />
                      {d.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="guestName">Guest name</Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Guest driver name"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="eventChoice">Event</Label>
            <Select value={eventChoice} onValueChange={setEventChoice}>
              <SelectTrigger id="eventChoice" className="w-full">
                <SelectValue placeholder="Select a special event…">
                  {eventChoice === CUSTOM_EVENT ? 'Custom…' : eventChoice || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {specialEvents.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_EVENT}>Custom…</SelectItem>
              </SelectContent>
            </Select>
            {eventChoice === CUSTOM_EVENT && (
              <Input
                value={customEventName}
                onChange={(e) => setCustomEventName(e.target.value)}
                placeholder="e.g. NLS, Majors"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entryName">Entry</Label>
            <Input
              id="entryName"
              value={entryName}
              onChange={(e) => setEntryName(e.target.value)}
              placeholder="e.g. MURDER1"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="carNumber">Car #</Label>
            <Input
              id="carNumber"
              value={carNumber}
              onChange={(e) => setCarNumber(e.target.value)}
              placeholder="e.g. 47"
            />
            <p className="text-xs text-muted-foreground">
              Must match the car number in-sim — the pit wall dashboard uses this to tell
              entries apart automatically.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Car Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {CAR_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setCarType(type.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors',
                    carType === type.value
                      ? 'border-primary bg-primary/10'
                      : 'border-input hover:bg-muted'
                  )}
                >
                  <img src={type.img} alt={type.label} className="h-auto w-full" />
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={!isValid || submitting}>
            {submitting
              ? 'Adding…'
              : mode === 'roster' && selectedIds.length > 1
              ? `Add ${selectedIds.length} Drivers`
              : 'Add Driver'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
