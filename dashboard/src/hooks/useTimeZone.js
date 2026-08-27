import { useEffect, useState } from 'react';

const STORAGE_KEY_PREFIX = 'pitwall.timezone';

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

// Browser ICU data only has letter abbreviations for North American zones —
// everywhere else Intl's 'short' style falls back to a GMT+X offset (see the
// zones below in COMMON_TIMEZONES). Standard/daylight pairs for those, so
// zones that don't observe DST (Tokyo, Dubai, Perth...) just use one value.
const ZONE_ABBREVIATIONS = {
    'Pacific/Auckland': { standard: 'NZST', daylight: 'NZDT' },
    'Australia/Sydney': { standard: 'AEST', daylight: 'AEDT' },
    'Australia/Perth': { standard: 'AWST', daylight: 'AWST' },
    'Asia/Tokyo': { standard: 'JST', daylight: 'JST' },
    'Asia/Shanghai': { standard: 'CST', daylight: 'CST' },
    'Asia/Kolkata': { standard: 'IST', daylight: 'IST' },
    'Asia/Dubai': { standard: 'GST', daylight: 'GST' },
    'Europe/Moscow': { standard: 'MSK', daylight: 'MSK' },
    'Africa/Cairo': { standard: 'EET', daylight: 'EEST' },
    'Europe/Stockholm': { standard: 'CET', daylight: 'CEST' },
    'Europe/Paris': { standard: 'CET', daylight: 'CEST' },
    'Europe/London': { standard: 'GMT', daylight: 'BST' },
    'America/Sao_Paulo': { standard: 'BRT', daylight: 'BRT' },
    'Pacific/Honolulu': { standard: 'HST', daylight: 'HST' },
};

// Zone abbreviation (e.g. "PDT" vs "PST") computed against the current
// date, so it already reflects whether this specific IANA zone is
// currently observing DST — no separate DST check needed. Falls back to the
// map above for zones ICU doesn't have a letter code for, picking
// standard/daylight by checking Intl's long form for "Summer"/"Daylight"
// (works in both hemispheres, since Intl already knows this zone's DST
// calendar for the given date).
export function getTimeZoneAbbreviation(timezone) {
    const shortParts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short',
    }).formatToParts(new Date());
    const short = shortParts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    if (/^[A-Z]+$/.test(short)) return short;

    const pair = ZONE_ABBREVIATIONS[timezone];
    if (!pair) return short || timezone;

    const longParts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'long',
    }).formatToParts(new Date());
    const long = longParts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    return /Summer|Daylight/i.test(long) ? pair.daylight : pair.standard;
}

function getDefaultTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function useTimezone(page, defaultTimezone = getDefaultTimezone()) {
    const storageKey = page ? `${STORAGE_KEY_PREFIX}.${page}` : STORAGE_KEY_PREFIX;
    const [timezone, setTimezone] = useState(
        () => localStorage.getItem(storageKey) || defaultTimezone
    );

    useEffect(() => {
        localStorage.setItem(storageKey, timezone);
    }, [storageKey, timezone]);

    return [timezone, setTimezone];
}

export function formatInTimezone(date, timezone, options = {}) {
    return new Intl.DateTimeFormat(undefined, {
        timeZone: timezone,
        ...options,
    }).format(new Date(date));
}

export function ordinalSuffix(day) {
    if (day % 10 === 1 && day % 100 !== 11) return 'st';
    if (day % 10 === 2 && day % 100 !== 12) return 'nd';
    if (day % 10 === 3 && day % 100 !== 13) return 'rd';
    return 'th';
}

// useTimeZone.js — new export
function getOffsetMinutes(timeZone, date) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const asIfUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return (asIfUtc - date.getTime()) / 60000;
}

// Converts a "wall clock" datetime-local string (e.g. "2026-09-06T15:00")
// that represents a time IN the given IANA zone into a real UTC instant.
export function zonedTimeToUtcIso(dateTimeLocalStr, timeZone) {
    const guess = new Date(`${dateTimeLocalStr}:00Z`);
    const offsetMinutes = getOffsetMinutes(timeZone, guess);
    return new Date(guess.getTime() - offsetMinutes * 60000).toISOString();
}