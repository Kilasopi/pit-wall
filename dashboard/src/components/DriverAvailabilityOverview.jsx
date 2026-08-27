import { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RELAY_HTTP_URL } from '@/lib/relay';
import { zonedTimeToUtcIso, getTimeZoneAbbreviation, getUtcOffsetLabel } from '@/hooks/useTimeZone';


// The minimum readable scale — used as-is (with horizontal scroll) once a
// race is long enough that stretching to fill the container would make an
// hour too narrow to read; short races stretch past this to fill the width.
const MIN_PX_PER_HOUR = 130;
const ROW_HEIGHT = 28;
const ROW_GAP = 6;

const DRIVER_COLORS = ['#5DCAA5', '#378ADD', '#7F77DD', '#F0997B', '#ED93B1', '#639922'];

function driverKey(driver) {
  return driver.is_guest ? `guest:${driver.guest_name}` : `roster:${driver.driver_id}`;
}

function formatClock(date) {
  return new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatDuration(minutes) {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ');
}

function dayOptionsInWindow(window, timezone) {
    if (!window) return [];
    const days = [];
    const cursor = new Date(window.start);
    cursor.setUTCHours(0, 0, 0, 0);
    while (cursor <= window.end) {
        const label = new Intl.DateTimeFormat(undefined, { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' }).format(cursor);
        const value = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(cursor);
        days.push({ value, label });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return [...new Map(days.map((d) => [d.value, d])).values()];
}

function isoToDayAndTime(iso, timezone) {
    const date = new Date(iso);
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
    return { day, time };
}

function patchBlock(id, body, token) {
    return fetch(`${RELAY_HTTP_URL}/api/availability-blocks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    });
}

function postBlock(signupId, body, token) {
    return fetch(`${RELAY_HTTP_URL}/api/signups/${signupId}/availability-blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    });
}

function deleteBlock(id, token) {
    return fetch(`${RELAY_HTTP_URL}/api/availability-blocks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
}

function AvailabilityBlockEditPanel({ block, driverTimezone, window, onCancel, onSave, onRemove }) {
    const tz = driverTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const startParts = isoToDayAndTime(block.start_at, tz);
    const endParts = isoToDayAndTime(block.end_at, tz);
    const [day, setDay] = useState(startParts.day);
    const [startTime, setStartTime] = useState(startParts.time);
    const [endTime, setEndTime] = useState(endParts.time);
    const [severity, setSeverity] = useState(block.severity);
    const [reason, setReason] = useState(block.reason ?? '');
    const days = dayOptionsInWindow(window, tz);

    function save() {
        if (!day || !startTime || !endTime) return;
        const startIso = zonedTimeToUtcIso(`${day}T${startTime}`, tz);
        const endDay = endTime < startTime
            ? new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
                .format(new Date(new Date(`${day}T00:00:00`).getTime() + 24 * 3600000))
            : day;
        const endIso = zonedTimeToUtcIso(`${endDay}T${endTime}`, tz);
        if (window && (new Date(startIso) < window.start || new Date(endIso) > window.end)) {
            alert('That falls outside the race weekend window.');
            return;
        }
        onSave({ startAt: startIso, endAt: endIso, severity, reason });
    }

    return (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-input p-2">
            <div className="flex gap-2">
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Date ({getTimeZoneAbbreviation(tz)} {getUtcOffsetLabel(tz)})</label>
                    <Select value={day} onValueChange={setDay}>
                        <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Pick day" /></SelectTrigger>
                        <SelectContent>
                            {days.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Start Time:</label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-8 w-36" />
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">End Time:</label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-8 w-36" />
                </div>
            </div>
            <div className="flex gap-2">
                <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger className="h-8 w-36">
                        <SelectValue>{severity === 'blackout' ? 'Blackout' : 'Prefer to avoid'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="blackout">Blackout</SelectItem>
                        <SelectItem value="avoid">Prefer to avoid</SelectItem>
                    </SelectContent>
                </Select>
                <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="h-8 flex-1" />
            </div>
            <div className="flex justify-end gap-2">
                {onRemove && (
                    <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive mr-auto">Remove</Button>
                )}
                <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button variant="dark" size="sm" onClick={save} className="border-murder-pink-dark">Save</Button>
            </div>
        </div>
    );
}

export function DriverAvailabilityOverview({ group, token, onChange }) {
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [addingForSignupId, setAddingForSignupId] = useState(null);
  const scrollRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const raceStartAt = group.raceSettings?.race_start_at ? new Date(group.raceSettings.race_start_at) : null;
  const preRaceMinutes = (group.raceSettings?.practice_minutes ?? 0) + (group.raceSettings?.quali_minutes ?? 0);
  const windowStart = raceStartAt ? new Date(raceStartAt.getTime() + preRaceMinutes * 60000) : null;
  const raceLengthMinutes = group.raceSettings?.race_length_minutes ?? null;
  const windowEnd = windowStart && raceLengthMinutes ? new Date(windowStart.getTime() + raceLengthMinutes * 60000) : null;

  if (!windowStart || !windowEnd) {
    return (
      <Card>
        <CardHeader><CardTitle>Availability overview</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Set a race start and length to see the availability overview.</p>
        </CardContent>
      </Card>
    );
  }

  const totalMinutes = (windowEnd.getTime() - windowStart.getTime()) / 60000;
  const totalHours = totalMinutes / 60;
  const pxPerHour = containerWidth > 0 ? Math.max(MIN_PX_PER_HOUR, containerWidth / totalHours) : MIN_PX_PER_HOUR;
  const pxPerMinute = pxPerHour / 60;
  const totalWidth = totalMinutes * pxPerMinute;

  const availabilityWindow = (group.timeslots ?? []).length > 0 ? {
    start: new Date(Math.min(...group.timeslots.map((t) => new Date(t.start_at).getTime())) - 6 * 3600000),
    end: new Date(Math.max(...group.timeslots.map((t) => new Date(t.start_at).getTime())) + (raceLengthMinutes ?? 0) * 60000 + 6 * 3600000),
  } : { start: windowStart, end: windowEnd };

  function xFor(date) {
    return Math.max(0, (date.getTime() - windowStart.getTime()) / 60000) * pxPerMinute;
  }

  // Same accumulation StintGroup uses, so segments line up with the same clock,
  // then merges consecutive stints by the same driver into one continuous block
  // (matches StintGroup's "Double Stint" grouping) instead of showing separate
  // adjacent segments.
  let cursor = windowStart;
  const rawStints = group.drivers.map((d) => {
    const minutes = d.stint_minutes ?? 60;
    const start = cursor;
    const end = new Date(cursor.getTime() + minutes * 60000);
    cursor = end;
    return { driver: d, start, end };
  });

  const mergedStints = [];
  for (const s of rawStints) {
    const last = mergedStints[mergedStints.length - 1];
    if (last && driverKey(last.driver) === driverKey(s.driver)) {
      last.end = s.end;
    } else {
      mergedStints.push({ driver: s.driver, start: s.start, end: s.end });
    }
  }

  const now = new Date();
  const nowX = now >= windowStart && now <= windowEnd ? xFor(now) : null;

  const hourMarks = [];
  for (let m = 0; m <= totalMinutes; m += 60) {
    hourMarks.push(new Date(windowStart.getTime() + m * 60000));
  }

  const gridStyle = {
    backgroundImage:
      `repeating-linear-gradient(to right, var(--border-strong, var(--border)) 0, var(--border-strong, var(--border)) 1px, transparent 1px, transparent ${pxPerHour}px), ` +
      `repeating-linear-gradient(to right, var(--border) 0, var(--border) 1px, transparent 1px, transparent ${pxPerHour / 2}px), ` +
      `repeating-linear-gradient(to right, color-mix(in srgb, var(--border) 50%, transparent) 0, color-mix(in srgb, var(--border) 50%, transparent) 1px, transparent 1px, transparent ${pxPerHour / 4}px)`,
  };

  return (
    <Card>
      <CardHeader><CardTitle>Availability overview</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="flex shrink-0 flex-col" style={{ width: 110 }}>

            <div className="flex flex-col" style={{ gap: ROW_GAP }}>
              {group.roster.map((driver) => (
                <div key={driver.signup_id} className="flex items-center justify-between gap-1" style={{ height: ROW_HEIGHT }}>
                  <span className="truncate text-xs font-medium">{driver.driver_name}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Add blackout"
                    onClick={() => { setAddingForSignupId(driver.signup_id); setEditingBlockId(null); }}
                  >
                    +
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-x-auto">
            <div className="relative" style={{ width: totalWidth }}>
              <div className="absolute inset-0" style={gridStyle} />
              {nowX != null && (
                <>
                  <div className="absolute top-0 bottom-0 w-px bg-destructive" style={{ left: nowX }} />
                  <span className="absolute -top-4 -translate-x-1/2 text-[10px] text-destructive whitespace-nowrap" style={{ left: nowX }}>
                    Now
                  </span>
                </>
              )}
              <div className="relative flex flex-col" style={{ gap: ROW_GAP }}>
                {group.roster.map((driver, i) => {
                  const key = driverKey({ is_guest: driver.is_guest, guest_name: driver.guest_name, driver_id: driver.driver_id });
                  const stints = mergedStints.filter((s) => driverKey(s.driver) === key);
                  const blocks = (group.blocks ?? [])
                    .filter((b) => b.signup_id === driver.signup_id)
                    .map((b) => ({
                      ...b,
                      clippedStart: new Date(b.start_at) < windowStart ? windowStart : new Date(b.start_at),
                      clippedEnd: new Date(b.end_at) > windowEnd ? windowEnd : new Date(b.end_at),
                    }))
                    .filter((b) => b.clippedEnd > windowStart && b.clippedStart < windowEnd);

                  return (
                    <div key={driver.signup_id} className="relative" style={{ height: ROW_HEIGHT }}>
                      {stints.map((s, si) => (
                        <div
                          key={si}
                          title={`Stint · ${formatClock(s.start)}–${formatClock(s.end)} (${formatDuration((s.end - s.start) / 60000)})`}
                          className="absolute top-0 rounded"
                          style={{
                            left: xFor(s.start),
                            width: Math.max(2, xFor(s.end) - xFor(s.start)),
                            height: ROW_HEIGHT,
                            background: DRIVER_COLORS[i % DRIVER_COLORS.length],
                            opacity: 0.85,
                          }}
                        />
                      ))}
                      {blocks.map((b) => (
                        <div
                          key={b.id}
                          title={`${b.severity === 'blackout' ? 'Blackout' : 'Prefer to avoid'}${b.reason ? ': ' + b.reason : ''}`}
                          onClick={() => { setEditingBlockId(b.id); setAddingForSignupId(null); }}
                          className={`absolute top-0 rounded border-2 cursor-pointer ${
                            b.severity === 'blackout' ? 'bg-destructive border-destructive' : 'bg-murder-yellow border-murder-yellow-dark'
                          }`}
                          style={{
                            left: xFor(b.clippedStart),
                            width: Math.max(2, xFor(b.clippedEnd) - xFor(b.clippedStart)),
                            height: ROW_HEIGHT,
                          }}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>

              <div className="flex" style={{ marginTop: 4 }}>
                {hourMarks.map((h, i) => (
                  <span key={i} className="text-[11px] text-muted-foreground" style={{ width: pxPerHour }}>
                    {formatClock(h)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex gap-4">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-sm bg-destructive" /> Blackout
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-sm bg-murder-yellow" /> Prefer to avoid
          </span>
        </div>
        {editingBlockId && (() => {
            const block = (group.blocks ?? []).find((b) => b.id === editingBlockId);
            const driver = group.roster.find((d) => d.signup_id === block?.signup_id);
            if (!block || !driver) return null;
            return (
                <AvailabilityBlockEditPanel
                    block={block}
                    driverTimezone={driver.timezone}
                    window={availabilityWindow}
                    onCancel={() => setEditingBlockId(null)}
                    onSave={(patch) => {
                        patchBlock(block.id, patch, token).then(() => {
                            onChange?.();
                            setEditingBlockId(null);
                        });
                    }}
                    onRemove={() => {
                        deleteBlock(block.id, token).then(() => {
                            onChange?.();
                            setEditingBlockId(null);
                        });
                    }}
                />
            );
        })()}

        {addingForSignupId && (() => {
            const driver = group.roster.find((d) => d.signup_id === addingForSignupId);
            if (!driver) return null;
            const defaultBlock = {
                start_at: windowStart.toISOString(),
                end_at: new Date(windowStart.getTime() + 3600000).toISOString(),
                severity: 'blackout',
                reason: '',
            };
            return (
                <AvailabilityBlockEditPanel
                    block={defaultBlock}
                    driverTimezone={driver.timezone}
                    window={availabilityWindow}
                    onCancel={() => setAddingForSignupId(null)}
                    onSave={(patch) => {
                        postBlock(addingForSignupId, patch, token).then(() => {
                            onChange?.();
                            setAddingForSignupId(null);
                        });
                    }}
                />
            );
        })()}
      </CardContent>
    </Card>
  );
}