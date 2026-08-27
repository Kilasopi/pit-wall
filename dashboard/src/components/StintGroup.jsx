import { useRef, useState } from 'react';
import { RELAY_HTTP_URL } from '@/lib/relay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from '@/components/ui/card';
import { carTypeImage } from '@/lib/carTypes';
import { getTimeZoneAbbreviation, getUtcOffsetLabel } from '@/hooks/useTimeZone';

export const DEFAULT_STINT_MINUTES = 60;

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
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
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

function conflictingBlocks(blocks, signupId, start, end) {
  if (!start || !end || signupId == null) return [];
  return blocks.filter((b) =>
    b.signup_id === signupId && new Date(b.start_at) < end && new Date(b.end_at) > start
  );
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

export function StintGroup({ group, onChange, saveRaceSettings }) {
  const raceStartAt = group.raceSettings?.race_start_at ?? null;
  const [localStart, setLocalStart] = useState(
    raceStartAt ? toDatetimeLocalValue(new Date(raceStartAt)) : ''
  );
  const [dragIndex, setDragIndex] = useState(null);
  const [bulkStintLength, setBulkStintLength] = useState('');
  const [localMinutes, setLocalMinutes] = useState({});
  const debounceTimers = useRef({});

  const signupIdByDriverKey = new Map(
    group.roster.map((r) => [driverKey({ is_guest: r.is_guest, guest_name: r.guest_name, driver_id: r.driver_id }), r.signup_id])
  );

  function debounced(key, fn, delay = 500) {
    clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(fn, delay);
  }

  const raceLengthMinutesAt = group.raceSettings?.race_length_minutes ?? null;
  const [lengthHoursInput, setLengthHoursInput] = useState(
    raceLengthMinutesAt != null ? String(Math.floor(raceLengthMinutesAt / 60)) : ''
  );
  const [lengthMinutesInput, setLengthMinutesInput] = useState(
    raceLengthMinutesAt != null ? String(raceLengthMinutesAt % 60) : ''
  );

  const [practiceMinutesInput, setPracticeMinutesInput] = useState(
    group.raceSettings?.practice_minutes != null ? String(group.raceSettings.practice_minutes) : ''
  );
  const [qualiMinutesInput, setQualiMinutesInput] = useState(
    group.raceSettings?.quali_minutes != null ? String(group.raceSettings.quali_minutes) : ''
  );

  function saveRaceStart(value) {
    setLocalStart(value);
    if (!value) return;
    const iso = new Date(`${value}:00Z`).toISOString();
    saveRaceSettings({ raceStartAt: iso }).then(() => onChange?.());
  }

  function saveRaceLengthParts(hoursValue, minutesValue) {
    const totalMinutes = (Number(hoursValue) || 0) * 60 + (Number(minutesValue) || 0);
    if (!totalMinutes) return;
    debounced('raceLength', () => {
      saveRaceSettings({ raceLengthMinutes: totalMinutes }).then(() => onChange?.());
    });
  }

  function saveRaceLengthHours(value) {
    setLengthHoursInput(value);
    saveRaceLengthParts(value, lengthMinutesInput);
  }

  function saveRaceLengthMinutes(value) {
    setLengthMinutesInput(value);
    saveRaceLengthParts(lengthHoursInput, value);
  }

  function savePracticeMinutes(value) {
    setPracticeMinutesInput(value);
    const minutes = Number(value);
    if (!value) return;
    debounced('practiceMinutes', () => {
      saveRaceSettings({ practiceMinutes: minutes }).then(() => onChange?.());
    });
  }

  function saveQualiMinutes(value) {
    setQualiMinutesInput(value);
    const minutes = Number(value);
    if (!value) return;
    debounced('qualiMinutes', () => {
      saveRaceSettings({ qualiMinutes: minutes }).then(() => onChange?.());
    });
  }

  const raceLengthMinutes = (Number(lengthHoursInput) || 0) * 60 + (Number(lengthMinutesInput) || 0) || null;

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
      patchEntryDriver(driverId, { stintMinutes: minutes }).then(() => onChange?.());
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
      Promise.all(group.drivers.map((d) => patchEntryDriver(d.id, { stintMinutes: minutes }))).then(() => onChange?.());
    });
  }

  function reorder(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const reordered = [...group.drivers];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    Promise.all(reordered.map((d, i) => patchEntryDriver(d.id, { stintOrder: i }))).then(() => onChange?.());
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
      teamId: group.teamId,
      carNumber: null,
      carType: group.carType,
      stintMinutes: raceLengthMinutes
        ? Math.max(5, Math.min(typicalStintMinutes, timeRemainingForNewStints))
        : typicalStintMinutes,
    });
    const fullOrder = [...group.drivers, created];
    await Promise.all(fullOrder.map((d, i) => patchEntryDriver(d.id, { stintOrder: i })));
    onChange?.();
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
      teamId: group.teamId,
      carNumber: null,
      carType: group.carType,
      stintMinutes: raceLengthMinutes
        ? Math.max(5, Math.min(typicalStintMinutes, timeRemainingForNewStints))
        : typicalStintMinutes,
    });
    const newOrder = [...group.drivers];
    newOrder.splice(afterIndex + 1, 0, created);
    await Promise.all(newOrder.map((d, i) => patchEntryDriver(d.id, { stintOrder: i })));
    onChange?.();
  }

  const raceStart = raceStartAt ? new Date(raceStartAt) : null;
  const preRaceMinutes = (Number(practiceMinutesInput) || 0) + (Number(qualiMinutesInput) || 0);
  const scheduleStart = raceStart
    ? new Date(raceStart.getTime() + preRaceMinutes * 60000)
    : null;
  const raceEnd = scheduleStart && raceLengthMinutes
    ? new Date(scheduleStart.getTime() + raceLengthMinutes * 60000)
    : null;

  let cursor = scheduleStart;
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
            <Label htmlFor={`length-hours-${group.entryName}`}>Race length</Label>
            <div className="flex items-center gap-1">
              <Input
                id={`length-hours-${group.entryName}`}
                type="number"
                min={0}
                step={1}
                value={lengthHoursInput}
                onChange={(e) => saveRaceLengthHours(e.target.value)}
                placeholder="hr"
                className="w-16"
              />
              <span className="text-sm text-muted-foreground">h</span>
              <Input
                id={`length-minutes-${group.entryName}`}
                type="number"
                min={0}
                max={59}
                step={5}
                value={lengthMinutesInput}
                onChange={(e) => saveRaceLengthMinutes(e.target.value)}
                placeholder="min"
                className="w-16"
              />
              <span className="text-sm text-muted-foreground">m</span>
            </div>
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`practice-${group.entryName}`}>Practice length (min)</Label>
            <Input
              id={`practice-${group.entryName}`}
              type="number"
              min={0}
              step={5}
              value={practiceMinutesInput}
              onChange={(e) => savePracticeMinutes(e.target.value)}
              placeholder="e.g. 30"
              className="w-24"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`quali-${group.entryName}`}>Quali length (min)</Label>
            <Input
              id={`quali-${group.entryName}`}
              type="number"
              min={0}
              step={5}
              value={qualiMinutesInput}
              onChange={(e) => saveQualiMinutes(e.target.value)}
              placeholder="e.g. 15"
              className="w-24"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`quali-driver-${group.entryName}`}>Quali Driver</Label>
            <select
              id={`quali-driver-${group.entryName}`}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={group.raceSettings?.quali_signup_id ?? ''}
              onChange={(e) => {
                saveRaceSettings({ qualiSignupId: Number(e.target.value) }).then(() => onChange?.());
              }}
            >
              <option value="" disabled>Pick a driver…</option>
              {group.roster.map((driver) => (
                <option key={driver.signup_id} value={driver.signup_id}>{driver.driver_name}</option>
              ))}
            </select>
            {group.raceSettings?.quali_driver_name && (
              <p className="text-xs text-muted-foreground">
                Fastest laps not available yet — Garage61 integration (#9) not built.
              </p>
            )}
          </div>
        </div>

        {raceEnd && (
          <p className="text-sm text-muted-foreground">
            Race ends {formatLocal(raceEnd, 'UTC')} UTC
            {' — '}
            {formatDuration(Math.max(0, (raceEnd.getTime() - Date.now()) / 60000))} remaining
          </p>
        )}

        {raceLengthMinutes && totalScheduledMinutes > raceLengthMinutes && (
          <p className="text-sm text-destructive">
            Scheduled stints total {formatDuration(totalScheduledMinutes)}, which is{' '}
            {formatDuration(totalScheduledMinutes - raceLengthMinutes)} over the {formatDuration(raceLengthMinutes)} race
            length — shorten a stint above.
          </p>
        )}

        

        <div className="flex flex-col gap-2">
          <Label>Drivers</Label>
          <div className="flex flex-wrap gap-2">
            {group.roster.map((driver) => (
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
            const localTz = 'UTC';
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
                        {formatLocal(first.start, localTz)} – {formatLocal(last.end, localTz)} UTC
                        {first.driver.timezone && (
                          <span className="ml-2">
                            — {formatLocal(first.start, first.driver.timezone)} – {formatLocal(last.end, first.driver.timezone)} {getTimeZoneAbbreviation(first.driver.timezone)} ({getUtcOffsetLabel(first.driver.timezone)})
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
                          {formatLocal(start, localTz)} – {formatLocal(end, localTz)} UTC
                          {driver.timezone && (
                            <span className="ml-2">
                              — Starts: {formatLocal(start, driver.timezone)} – Ends: {formatLocal(end, driver.timezone)} {getTimeZoneAbbreviation(driver.timezone)} ({getUtcOffsetLabel(driver.timezone)})
                            </span>
                          )}
                          {conflictingBlocks(group.blocks ?? [], signupIdByDriverKey.get(driverKey(driver)), start, end).map((b) => (
                            <Badge
                              key={b.id}
                              variant="secondary"
                              title={`${b.severity === 'blackout' ? 'Blackout' : 'Prefer to avoid'}${b.reason ? ': ' + b.reason : ''} (${formatLocal(new Date(b.start_at), localTz)} – ${formatLocal(new Date(b.end_at), localTz)} UTC / ${formatLocal(new Date(b.start_at), driver.timezone)} – ${formatLocal(new Date(b.end_at), driver.timezone)} ${getTimeZoneAbbreviation(driver.timezone)} (${getUtcOffsetLabel(driver.timezone)}))`}
                              className={`ml-2 gap-1 ${b.severity === 'blackout' ? 'border-destructive text-destructive' : 'border-yellow-500 text-yellow-600'}`}
                            >
                              ⚠ {b.severity === 'blackout' ? 'Blackout conflict' : 'Avoid — sub-optimal'}
                            </Badge>
                          ))}
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
                    <Button variant="ghost" size="sm" onClick={() => deleteEntryDriver(driver.id).then(() => onChange?.())}>
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
                {formatLocal(remainingSlot.start, 'UTC')}
                {' – '}
                {formatLocal(remainingSlot.end, 'UTC')}
                {' UTC'}
                {' · use "Add Stint" above to take it'}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
