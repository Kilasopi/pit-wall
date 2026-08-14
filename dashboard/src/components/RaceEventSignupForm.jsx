import { useState } from 'react';
import { useDrivers } from '@/hooks/useDrivers';
import { COMMON_TIMEZONES, getUtcOffsetLabel } from '@/hooks/useTimeZone';
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

const ALL_CAR_CLASSES = ['GTP', 'LMP2', 'GT1', 'GT2', 'GT3', 'GT4', 'Porsche Cup', 'TCR', 'BMW M2'];
const CLASS_TOKEN_PATTERN = new RegExp(`\\b(${['GTP', 'LMP2', 'GT1', 'GT2', 'GT3', 'GT4', 'TCR', 'BMW M2'].join('|')})\\b`);

// Exact-name overrides, checked before the regex. Two reasons a car needs
// one: its class isn't in its name at all (Dallara P217 has no "LMP2"),
// or its name is misleading and would false-match the wrong token (both
// Porsche Cup cars contain the literal substring "GT3"/"911", which would
// otherwise get them classified as GT3).
const CAR_NAME_TO_CLASS = {
    'Dallara P217': 'LMP2',
    'Porsche 911 Cup (992.2)': 'Porsche Cup',
    'Porsche 911 GT3 Cup (992.2)': 'Porsche Cup',
    'HPD ARX-01c': 'LMP2',
    'Chevrolet Corvette C6.R': 'GT1',
    'HPD': 'LMP2',
    'Porsche Cup 992.2': 'Porsche Cup',
    'BMW M Hybrid V8 (Evo)': 'GTP',
    'Ferrari 499P': 'GTP'
};

// carNames are either individual car model names (e.g. "Ferrari 296 GT3",
// scraped from the schedule PDF) or, for special events, already-short
// class-ish labels (e.g. "Porsche Cup 992.2", scraped from the listing
// page's "Cars Competing" summary). Either way we try to normalize down
// to a clean class token, but an unrecognized entry is still kept as its
// own option rather than dropped — better an odd label than a missing
// one. Only truly empty input falls back to the full generic list.
function deriveCarClasses(carNames) {
    if (!carNames || carNames.length === 0) return ALL_CAR_CLASSES;

    const classes = new Set();
    for (const name of carNames) {
        if (CAR_NAME_TO_CLASS[name]) {
            classes.add(CAR_NAME_TO_CLASS[name]);
            continue;
        }
        const match = name.match(CLASS_TOKEN_PATTERN);
        classes.add(match ? match[1] : name);
    }

    return [...classes];
}

export function RaceEventSignupForm({ raceEventId, carClasses, onAdded, onCancel }) {
    const { data: rosterDrivers } = useDrivers('murder-drivers');
    const availableCarClasses = deriveCarClasses(carClasses);

    const [driverId, setDriverId] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestIracingId, setGuestIracingId] = useState('');
    const [guestTimezone, setGuestTimezone] = useState('');
    const [carClass, setCarClass] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const isGuest = driverId === 'guest';
    const isValid =
        carClass.trim().length > 0 &&
        (isGuest ? guestName.trim().length > 0 && guestTimezone.length > 0 : driverId.length > 0);

    async function handleSubmit(event) {
        event.preventDefault();
        if (!isValid) return;

        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch(`${RELAY_HTTP_URL}/api/race-events/${raceEventId}/signups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driverId: isGuest ? null : Number(driverId),
                    guestName: isGuest ? guestName.trim() : null,
                    guestIracingId: isGuest ? guestIracingId.trim() || null : null,
                    guestTimezone: isGuest ? guestTimezone : null,
                    carClass: carClass.trim(),
                }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? `Failed to register (${res.status})`);
            }

            onAdded?.(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
                <Label className="mb-1 block text-sm text-muted-foreground">Driver</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select driver">
                            {(value) => {
                                if (value === 'guest') return 'Guest Driver';
                                const driver = rosterDrivers.find((d) => String(d.id) === value);
                                return driver ? (driver.nickname || driver.name) : null;
                            }}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {rosterDrivers.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                                {d.nickname ? `${d.name} | ${d.nickname}` : d.name}
                            </SelectItem>
                        ))}
                        <SelectItem value="guest">Guest Driver</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isGuest && (
                <>
                    <div>
                        <Label className="mb-1 block text-sm text-muted-foreground">Guest Name</Label>
                        <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                    </div>
                    <div>
                        <Label className="mb-1 block text-sm text-muted-foreground">iRacing ID</Label>
                        <Input value={guestIracingId} onChange={(e) => setGuestIracingId(e.target.value)} />
                    </div>
                    <div>
                        <Label className="mb-1 block text-sm text-muted-foreground">Timezone</Label>
                        <Select value={guestTimezone} onValueChange={setGuestTimezone}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select timezone">
                                    {(value) => value ? `${value.replace('_', ' ')} (${getUtcOffsetLabel(value)})` : null}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {COMMON_TIMEZONES.map((tz) => (
                                    <SelectItem key={tz} value={tz}>
                                        {tz.replace('_', ' ')} ({getUtcOffsetLabel(tz)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </>
            )}

            <div>
                <Label className="mb-1 block text-sm text-muted-foreground">Car Class</Label>
                <Select value={carClass} onValueChange={setCarClass}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select car class">
                            {(value) => value || null}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {availableCarClasses.map((cls) => (
                            <SelectItem key={cls} value={cls}>
                                {cls}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
                <Button type="submit" disabled={!isValid || submitting}>
                    {submitting ? 'Registering…' : 'Register'}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}