import { useState } from 'react';
import cityTimezones from 'city-timezones';

import { RELAY_HTTP_URL } from '@/lib/relay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function gmtOffset(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());

    return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

export function AddRosterDriverForm({ driver, onAdded, onCancel }) {
  const isEditing = Boolean(driver);

  const [name, setName] = useState(driver?.name ?? '');
  const [nickname, setNickname] = useState(driver?.nickname ?? '');
  const [iracingId, setIracingId] = useState(driver?.iracing_id ?? '');
  const [city, setCity] = useState(driver?.city ?? '');
  const [country, setCountry] = useState(driver?.country ?? '');
  const [timezone, setTimezone] = useState(driver?.timezone ?? '');
  const [active, setActive] = useState(driver?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isValid =
    name.trim().length > 0 &&
    city.trim().length > 0 &&
    country.trim().length === 2;

  function detectTimezone(cityName, countryCode = country) {
    if (!countryCode.trim()) return '';

    const matches = cityTimezones.lookupViaCity(cityName.trim());

    const match = matches.find(
      (location) =>
        location.iso2?.toLowerCase() === countryCode.trim().toLowerCase()
    );

    const detectedTimezone = match?.timezone ?? '';
    setTimezone(detectedTimezone);

    if (!detectedTimezone) {
      setError(`Could not find ${cityName} in ${countryCode.toUpperCase()}`);
    } else {
      setError(null);
    }

    return detectedTimezone;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isValid) return;

    setSubmitting(true);
    setError(null);

    try {
      const resolvedTimezone = timezone || detectTimezone(city);

      if (!resolvedTimezone) {
        setSubmitting(false);
        return;
      }

      const body = {
        name: name.trim(),
        nickname: nickname.trim() || null,
        iracingId: iracingId.trim() || null,
        city: city.trim(),
        country: country.trim() || null,
        timezone: resolvedTimezone,
      };

      if (isEditing) {
        body.active = active;
      }

      const endpoint = isEditing
        ? `${RELAY_HTTP_URL}/api/murder-drivers/${driver.id}`
        : `${RELAY_HTTP_URL}/api/murder-drivers`;

      const response = await fetch(endpoint, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let message = `${response.status} ${response.statusText}`;

        try {
          const data = await response.json();
          message = data.error ?? message;
        } catch {
          // The response did not contain JSON.
        }

        throw new Error(message);
      }

      if (!isEditing) {
        setName('');
        setNickname('');
        setIracingId('');
        setCity('');
        setTimezone('');
      }

      onAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save driver');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? `Edit ${driver.name}` : 'Add Roster Driver'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rosterName">Name</Label>
            <Input
              id="rosterName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Driver name"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rosterNickname">Nickname</Label>
            <Input
              id="rosterNickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rosterIracingId">iRacing ID</Label>
            <Input
              id="rosterIracingId"
              value={iracingId}
              onChange={(event) => setIracingId(event.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rosterCity">City</Label>
            <Input
              id="rosterCity"
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                setTimezone('');
                setError(null);
              }}
              onBlur={() => {
                if (city.trim()) {
                  detectTimezone(city);
                }
              }}
              placeholder="London"
              required
            />

            <p className="text-xs text-muted-foreground">
              {timezone
                ? `${timezone} (${gmtOffset(timezone)})`
                : 'Timezone will be detected automatically'}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rosterCountry">Country code</Label>
            <Input
              id="rosterCountry"
              value={country}
              onChange={(event) => {
                setCountry(event.target.value.toUpperCase());
                setTimezone('');
                setError(null);
              }}
              onBlur={() => {
                if (city.trim() && country.trim()) {
                  detectTimezone(city, country);
                }
              }}
              placeholder="GB"
              maxLength={2}
              required
            />

            <p className="text-xs text-muted-foreground">
              {timezone
                ? `${timezone} (${gmtOffset(timezone)})`
                : 'Enter a city and two-letter country code'}
            </p>
          </div>

          {isEditing && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              Active
            </label>
          )}

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={!isValid || submitting}>
              {submitting
                ? 'Saving…'
                : isEditing
                  ? 'Save Changes'
                  : 'Add Driver'}
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