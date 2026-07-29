import { useState } from 'react';
import { RELAY_HTTP_URL } from '@/lib/relay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const MAJOR_TIMEZONES = [
  { tz: 'Europe/London', label: 'UK (GMT/BST)' },
  { tz: 'Europe/Paris', label: 'Central Europe (CET/CEST)' },
  { tz: 'America/New_York', label: 'US Eastern' },
  { tz: 'America/Chicago', label: 'US Central' },
  { tz: 'America/Denver', label: 'US Mountain' },
  { tz: 'America/Los_Angeles', label: 'US Pacific' },
  { tz: 'America/Sao_Paulo', label: 'Brazil' },
  { tz: 'Australia/Sydney', label: 'Australia Eastern' },
  { tz: 'Australia/Perth', label: 'Australia Western' },
  { tz: 'Asia/Tokyo', label: 'Japan' },
  { tz: 'Asia/Singapore', label: 'Singapore' },
  { tz: 'Pacific/Auckland', label: 'New Zealand' },
  { tz: 'UTC', label: 'UTC' },
];

function gmtOffset(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

const TIMEZONES = MAJOR_TIMEZONES.map(({ tz, label }) => ({
  tz,
  label: `${label} (${gmtOffset(tz)})`,
}));

export function AddRosterDriverForm({ driver, onAdded, onCancel }) {
  const isEditing = Boolean(driver);
  const [name, setName] = useState(driver?.name ?? '');
  const [nickname, setNickname] = useState(driver?.nickname ?? '');
  const [iracingId, setIracingId] = useState(driver?.iracing_id ?? '');
  const [timezone, setTimezone] = useState(driver?.timezone ?? '');
  const [active, setActive] = useState(driver?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isValid = name.trim().length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setError(null);

    const body = {
      name: name.trim(),
      nickname: nickname.trim() || null,
      iracingId: iracingId.trim() || null,
      timezone: timezone || null,
    };
    if (isEditing) body.active = active;

    try {
      const res = await fetch(
        `${RELAY_HTTP_URL}/api/murder-drivers${isEditing ? `/${driver.id}` : ''}`,
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      if (!isEditing) {
        setName('');
        setNickname('');
        setIracingId('');
        setTimezone('');
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
        <CardTitle>{isEditing ? `Edit ${driver.name}` : 'Add Roster Driver'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rosterName">Name</Label>
            <Input
              id="rosterName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Driver name"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rosterNickname">Nickname</Label>
            <Input
              id="rosterNickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rosterIracingId">iRacing ID</Label>
            <Input
              id="rosterIracingId"
              value={iracingId}
              onChange={(e) => setIracingId(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rosterTimezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="rosterTimezone" className="w-full">
                <SelectValue placeholder="Optional">
                  {TIMEZONES.find((t) => t.tz === timezone)?.label ?? (timezone || undefined)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(({ tz, label }) => (
                  <SelectItem key={tz} value={tz}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isEditing && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={!isValid || submitting}>
              {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Driver'}
            </Button>
            {isEditing && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
