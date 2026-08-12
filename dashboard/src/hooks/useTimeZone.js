import { useEffect, useState } from 'react';

const STORAGE_KEY = 'pitwall.timezone';

export const COMMON_TIMEZONES = [
    'Pacific/Auckland',
    'Australia/Sydney',
    'Australia/Perth',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Europe/Moscow',
    'Africa/Cairo',
    'Europe/Stockholm',
    'Europe/Paris',
    'Europe/London',
    'UTC',
    'America/Sao_Paulo',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Vancouver',
    'Pacific/Honolulu',
];

export function getUtcOffsetLabel(timezone) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    return offset; // e.g. "GMT-7"
}

function getDefaultTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function useTimezone() {
    const [timezone, setTimezone] = useState(
        () => localStorage.getItem(STORAGE_KEY) || getDefaultTimezone()
    );

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, timezone);
    }, [timezone]);

    return [timezone, setTimezone];
}

export function formatInTimezone(date, timezone, options = {}) {
    return new Intl.DateTimeFormat(undefined, {
        timeZone: timezone,
        ...options,
    }).format(new Date(date));
}