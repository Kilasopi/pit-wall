import { useRef, useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { useDrivers } from '@/hooks/useDrivers';
import { RELAY_HTTP_URL } from '@/lib/relay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { carTypeImage } from '@/lib/carTypes';

const DEFAULT_STINT_MINUTES = 60;

function groupEntries(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.event_name}|||${row.entry_name}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        eventName: row.event_name,
        entryName: row.entry_name,
        carType: row.car_type ?? null,
        drivers: [],
      });
    }
    groups.get(key).drivers.push(row);
  }
  return [...groups.values()];
}

function uniqueDrivers(drivers) {
  const seen = new Set();
  const result = [];
  for (const d of drivers) {
    const key = d.is_guest ? `guest:${d.guest_name}` : `roster:${d.driver_id}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(d);
    }
  }
  return result;
}

function patchEntryDriver(id, body) {
  return fetch(`${RELAY_HTTP_URL}/api/entry-drivers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function createEntryDriver(body) {
  const res = await fetch(`${RELAY_HTTP_URL}/api/entry-drivers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function deleteEntryDriver(id) {
  return fetch(`${RELAY_HTTP_URL}/api/entry-drivers/${id}`, { method: 'DELETE' });
}

function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatLocal(date, timezone) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function driverKey(driver) {
  return driver.is_guest ? `guest:${driver.guest_name}` : `roster:${driver.driver_id}`;
}

// Groups consecutive stints by the same driver into one visual block
// (e.g. "Double Stint") without changing the underlying per-stint rows.
function groupConsecutiveStints(stints) {
  const blocks = [];
  stints.forEach((stint, i) => {
    const key = driverKey(stint.driver);
    const last = blocks[blocks.length - 1];
    if (last && last.key === key) {
      last.items.push({ ...stint, i });
    } else {
      blocks.push({ key, items: [{ ...stint, i }] });
    }
  });
  return blocks;
}

function stintCountLabel(count) {
  if (count === 2) return 'Double Stint';
  if (count === 3) return 'Triple Stint';
  return `${count}x Stint`;
}

function formatDuration(minutes) {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ');
}

function StintGroup({ group }) {
  const raceStartAt = group.drivers[0]?.race_start_at ?? null;
  const [localStart, setLocalStart] = useState(
    raceStartAt ? toDatetimeLocalValue(new Date(raceStartAt)) : ''
  );
  const [dragIndex, setDragIndex] = useState(null);
  const [bulkStintLength, setBulkStintLength] = useState('');
  const [localMinutes, setLocalMinutes] = useState({});
  const debounceTimers = useRef({});

  function debounced(key, fn, delay = 500) {
    clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(fn, delay);
  }

  const raceLengthMinutesAt = group.drivers[0]?.race_length_minutes ?? null;
  const [raceHours, setRaceHours] = useState(
    raceLengthMinutesAt ? String(raceLengthMinutesAt / 60) : ''
  );

  function saveRaceStart(value) {
    setLocalStart(value);
    if (!value) return;
    const iso = new Date(value).toISOString();
    Promise.all(group.drivers.map((d) => patchEntryDriver(d.id, { raceStartAt: iso })));
  }

  function saveRaceLength(value) {
    setRaceHours(value);
    const minutes = Number(value) * 60;
    if (!minutes) return;
    debounced('raceLength', () => {
      Promise.all(group.drivers.map((d) => patchEntryDriver(d.id, { raceLengthMinutes: minutes })));
    });
  }

  const raceLengthMinutes = Number(raceHours) * 60 || null;

  // The most common existing stint length in this entry, used as the
  // default for newly added stints instead of a hardcoded fallback.
  const typicalStintMinutes = (() => {
    const counts = new Map();
    for (const d of group.drivers) {
      if (d.stint_minutes == null) continue;
      counts.set(d.stint_minutes, (counts.get(d.stint_minutes) ?? 0) + 1);
    }
    let best = null;
    for (const [minutes, count] of counts) {
      if (!best || count > best.count) best = { minutes, count };
    }
    return best?.minutes ?? DEFAULT_STINT_MINUTES;
  })();

  const totalScheduledMinutes = group.drivers.reduce(
    (sum, d) => sum + (d.stint_minutes ?? DEFAULT_STINT_MINUTES),
    0
  );
  const timeRemainingForNewStints = raceLengthMinutes
    ? raceLengthMinutes - totalScheduledMinutes
    : Infinity;

  function handleDurationInput(driverId, rawValue) {
    setLocalMinutes((prev) => ({ ...prev, [driverId]: rawValue }));
    debounced(`duration-${driverId}`, () => {
      let minutes = Number(rawValue);
      if (raceLengthMinutes) {
        const current = group.drivers.find((d) => d.id === driverId)?.stint_minutes ?? DEFAULT_STINT_MINUTES;
        const maxAllowed = raceLengthMinutes - (totalScheduledMinutes - current);
        minutes = Math.max(5, Math.min(minutes, maxAllowed));
      }
      patchEntryDriver(driverId, { stintMinutes: minutes });
      setLocalMinutes((prev) => {
        const next = { ...prev };
        delete next[driverId];
        return next;
      });
    });
  }

  function applyBulkStintLength(value) {
    setBulkStintLength(value);
    let minutes = Number(value);
    if (!minutes) return;
    if (raceLengthMinutes) {
      minutes = Math.max(5, Math.min(minutes, Math.floor(raceLengthMinutes / group.drivers.length)));
    }
    debounced('bulkStintLength', () => {
      Promise.all(group.drivers.map((d) => patchEntryDriver(d.id, { stintMinutes: minutes })));
    });
  }

  function reorder(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const reordered = [...group.drivers];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    Promise.all(reordered.map((d, i) => patchEntryDriver(d.id, { stintOrder: i })));
  }

  // Always appends to the true end and renormalizes every row's stint_order
  // to a dense 0..n-1 sequence, so a fresh stint can never land mid-list.
  async function addStint(driver) {
    if (raceLengthMinutes && timeRemainingForNewStints <= 0) {
      alert('The full race length is already scheduled — free up time before adding another stint.');
      return;
    }

    const created = await createEntryDriver({
      driverId: driver.is_guest ? null : driver.driver_id,
      guestName: driver.is_guest ? driver.guest_name : null,
      eventName: group.eventName,
      entryName: group.entryName,
      carNumber: null,
      carType: group.carType,
      stintMinutes: raceLengthMinutes
        ? Math.max(5, Math.min(typicalStintMinutes, timeRemainingForNewStints))
        : typicalStintMinutes,
    });
    const fullOrder = [...group.drivers, created];
    await Promise.all(fullOrder.map((d, i) => patchEntryDriver(d.id, { stintOrder: i })));
  }

  // Inserts a new stint for `driver` directly after `afterIndex`, instead of
  // at the very end — used by the per-row "+ Stint" button.
  async function addStintAfter(driver, afterIndex) {
    if (raceLengthMinutes && timeRemainingForNewStints <= 0) {
      alert('The full race length is already scheduled — free up time before adding another stint.');
      return;
    }

    const created = await createEntryDriver({
      driverId: driver.is_guest ? null : driver.driver_id,
      guestName: driver.is_guest ? driver.guest_name : null,
      eventName: group.eventName,
      entryName: group.entryName,
      carNumber: null,
      carType: group.carType,
      stintMinutes: raceLengthMinutes
        ? Math.max(5, Math.min(typicalStintMinutes, timeRemainingForNewStints))
        : typicalStintMinutes,
    });
    const newOrder = [...group.drivers];
    newOrder.splice(afterIndex + 1, 0, created);
    await Promise.all(newOrder.map((d, i) => patchEntryDriver(d.id, { stintOrder: i })));
  }

  const raceStart = raceStartAt ? new Date(raceStartAt) : null;
  const raceEnd = raceStart && raceLengthMinutes
    ? new Date(raceStart.getTime() + raceLengthMinutes * 60000)
    : null;

  let cursor = raceStart;
  const stints = group.drivers.map((driver) => {
    const minutes = driver.stint_minutes ?? DEFAULT_STINT_MINUTES;
    const start = cursor;
    const end = cursor ? new Date(cursor.getTime() + minutes * 60000) : null;
    cursor = end;
    return { driver, minutes, start, end };
  });

  // Unassigned gap between the last scheduled stint and the race end —
  // nobody's claimed it yet; use "Add Stint" above to take it.
  const remainingMinutes = raceEnd && cursor ? (raceEnd.getTime() - cursor.getTime()) / 60000 : null;
  const remainingSlot =
    remainingMinutes && remainingMinutes > 0
      ? { start: cursor, end: raceEnd, minutes: remainingMinutes }
      : null;

  return (
    
    <Card>
      <CardHeader>
        <CardTitle>{group.entryName}</CardTitle>
        <CardDescription>{group.eventName}</CardDescription>
        {carTypeImage(group.carType) && (
          <CardAction>
            <img
              src={carTypeImage(group.carType)}
              alt={group.carType}
              className="h-10 w-auto"
              title={group.carType}
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`start-${group.entryName}`}>Race start</Label>
            <Input
              id={`start-${group.entryName}`}
              type="datetime-local"
              value={localStart}
              onChange={(e) => saveRaceStart(e.target.value)}
              className="w-fit"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`length-${group.entryName}`}>Race length (hours)</Label>
            <Input
              id={`length-${group.entryName}`}
              type="number"
              min={1}
              step={0.5}
              value={raceHours}
              onChange={(e) => saveRaceLength(e.target.value)}
              placeholder="e.g. 24"
              className="w-24"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`stint-length-${group.entryName}`}>Stint length (min)</Label>
            <Input
              id={`stint-length-${group.entryName}`}
              type="number"
              min={5}
              step={5}
              value={bulkStintLength}
              onChange={(e) => applyBulkStintLength(e.target.value)}
              placeholder="Set all to…"
              className="w-32"
            />
          </div>
        </div>

        {raceEnd && (
          <p className="text-sm text-muted-foreground">
            Race ends {formatLocal(raceEnd, Intl.DateTimeFormat().resolvedOptions().timeZone)}
            {' — '}
            {formatDuration(Math.max(0, (raceEnd.getTime() - Date.now()) / 60000))} remaining
          </p>
        )}

        {raceLengthMinutes && totalScheduledMinutes > raceLengthMinutes && (
          <p className="text-sm text-destructive">
            Scheduled stints total {formatDuration(totalScheduledMinutes)}, which is{' '}
            {formatDuration(totalScheduledMinutes - raceLengthMinutes)} over the {raceHours}h race
            length — shorten a stint above.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Label>Drivers</Label>
          <div className="flex flex-wrap gap-2">
            {uniqueDrivers(group.drivers).map((driver) => (
              <div
                key={driver.is_guest ? `guest:${driver.guest_name}` : `roster:${driver.driver_id}`}
                className="flex items-center gap-2 rounded-lg border border-input p-2 pl-3"
              >
                <span className="font-medium">{driver.driver_name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={raceLengthMinutes != null && timeRemainingForNewStints <= 0}
                  onClick={() => addStint(driver)}
                >
                  Add Stint
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Schedule — drag to reorder</Label>
          {groupConsecutiveStints(stints).map((block) => {
            const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const isMulti = block.items.length > 1;
            const first = block.items[0];
            const last = block.items[block.items.length - 1];

            return (
              <div
                key={`${block.key}-${first.i}`}
                className={isMulti ? 'flex flex-col gap-1.5 rounded-lg border border-primary/30 bg-muted/30 p-2' : 'contents'}
              >
                {isMulti && (
                  <div className="px-1 text-sm font-medium">
                    {first.driver.driver_name} — {stintCountLabel(block.items.length)}
                    {first.start && last.end && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {formatLocal(first.start, localTz)} – {formatLocal(last.end, localTz)}
                        {first.driver.timezone && (
                          <span className="ml-2">
                            — starts {formatLocal(first.start, first.driver.timezone)} their time
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}

                {block.items.map(({ driver, minutes, start, end, i }) => (
                  <div
                    key={driver.id}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragIndex !== null) reorder(dragIndex, i);
                      setDragIndex(null);
                    }}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-input bg-background p-2.5 cursor-grab active:cursor-grabbing"
                  >
                    <span className="text-muted-foreground">⠿</span>

                    <div className="min-w-32 font-medium">{driver.driver_name}</div>

                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={5}
                        step={5}
                        value={localMinutes[driver.id] ?? Math.round(minutes)}
                        onChange={(e) => handleDurationInput(driver.id, e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">min</span>
                    </div>

                    <div className="flex-1 text-sm text-muted-foreground">
                      {start && end ? (
                        <>
                          {formatLocal(start, localTz)} – {formatLocal(end, localTz)}
                          {driver.timezone && (
                            <span className="ml-2">
                              — starts {formatLocal(start, driver.timezone)} their time
                            </span>
                          )}
                        </>
                      ) : (
                        'Set a race start time'
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={raceLengthMinutes != null && timeRemainingForNewStints <= 0}
                      onClick={() => addStintAfter(driver, i)}
                    >
                      + Stint
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteEntryDriver(driver.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            );
          })}

          {remainingSlot && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-input p-2.5 text-muted-foreground">
              <span className="min-w-32 font-medium">Remaining time</span>
              <div className="flex-1 text-sm">
                {formatDuration(remainingSlot.minutes)} unclaimed —{' '}
                {formatLocal(remainingSlot.start, Intl.DateTimeFormat().resolvedOptions().timeZone)}
                {' – '}
                {formatLocal(remainingSlot.end, Intl.DateTimeFormat().resolvedOptions().timeZone)}
                {' · use "Add Stint" above to take it'}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StintPlannerPage() {
  const { data, loading } = useDrivers('entry-drivers');
  const groups = groupEntries(data);
  const [activeKey, setActiveKey] = useState(null);

  const activeGroup = groups.find((g) => g.key === activeKey) ?? groups[0] ?? null;

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-heading font-medium">Stint Planner</h1>
      </div>
      <NavBar />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No entry drivers yet — add some on the Drivers page first.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.length > 1 && (
            <div className="flex flex-wrap gap-2 border-b pb-2">
              {groups.map((group) => (
                <button
                  key={group.key}
                  onClick={() => setActiveKey(group.key)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    activeGroup?.key === group.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {carTypeImage(group.carType) && (
                    <img src={carTypeImage(group.carType)} alt="" className="h-5 w-auto" />
                  )}
                  {group.entryName}
                </button>
              ))}
            </div>
          )}

          {activeGroup && <StintGroup key={activeGroup.key} group={activeGroup} />}
        </div>
      )}
    </div>
  );
}

export default StintPlannerPage;
