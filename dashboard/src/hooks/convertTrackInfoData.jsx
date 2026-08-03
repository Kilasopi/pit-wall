import { useMemo, useRef } from "react";
import {
    Sun,
    CloudSun,
    Cloud,
    Cloudy,
    CircleHelp,
} from "lucide-react";

export function convertSkies(skies) {
    switch (skies) {
        case 0:
            return {
                Label: 'Clear', 
                Icon: Sun,
            };
        case 1:
            return {
                Label: 'Partly Cloudy',
                Icon: CloudSun,
            };
        case 2:
            return {
                Label: 'Mostly Cloudy',
                Icon: Cloud,
            };
        case 3:
            return {
                Label: 'Overcast',
                Icon: Cloudy,
            };
        default:
            return {
                Label: 'Unknown',
                Icon: CircleHelp,
            };
    }
}

export function radiansToCompass(radians) {
    const degrees =
        ((radians * 180) / Math.PI + 360) % 360

    const directions = [
        "N",
        "NNE",
        "NE",
        "ENE",
        "E",
        "ESE",
        "SE",
        "SSE",
        "S",
        "SSW",
        "SW",
        "WSW",
        "W",
        "WNW",
        "NW",
        "NNW",
    ]

    const index =
        Math.round(degrees / 22.5) % directions.length

    return {
        degrees,
        direction: directions[index],
    }
}

export function convertSessionState(state) {
    switch (state) {
        case 0:
            return 'Invalid';
        case 1:
            return 'Get In Car';
        case 2:
            return 'Warmup';
        case 3:
            return 'Parade Laps';
        case 4:
            return 'Racing';
        case 5:
            return 'Checkered';
        case 6:
            return 'Cool Down';
        case 7:
            return 'Result Showing';
        case 8:
            return 'Replaying';
        default:
            return 'Unknown';
    }
}

// iRacing SDK session flag bitmask (irsdk_Flags)
const SessionFlags = {
    checkered: 0x00000001,
    white: 0x00000002,
    green: 0x00000004,
    yellow: 0x00000008,
    red: 0x00000010,
    blue: 0x00000020,
    debris: 0x00000040,
    crossed: 0x00000080,
    yellowWaving: 0x00000100,
    oneLapToGreen: 0x00000200,
    greenHeld: 0x00000400,
    tenToGo: 0x00000800,
    fiveToGo: 0x00001000,
    randomWaved: 0x00002000,
    caution: 0x00004000,
    cautionWaving: 0x00008000,
    black: 0x00010000,
    disqualify: 0x00020000,
    servicible: 0x00040000,
    furled: 0x00080000,
    repair: 0x00100000,
    startHidden: 0x10000000,
    startReady: 0x20000000,
    startSet: 0x40000000,
    startGo: 0x80000000,
};

// Checked most severe first — only the highest-priority active flag is shown.
const FLAG_PRIORITY = [
    { flag: SessionFlags.disqualify, text: 'DISQUALIFIED', className: 'bg-black text-white' },
    { flag: SessionFlags.red, text: 'RED FLAG — SESSION STOPPED', className: 'bg-red-600 text-white' },
    { flag: SessionFlags.black, text: 'BLACK FLAG', className: 'bg-black text-white' },
    { flag: SessionFlags.repair, text: 'MEATBALL FLAG — REPAIR REQUIRED', className: 'bg-orange-600 text-white' },
    { flag: SessionFlags.furled, text: 'BLACK FLAG WARNING', className: 'bg-gray-800 text-white' },
    { flag: SessionFlags.cautionWaving, text: 'CAUTION — YELLOW FLAG WAVING', className: 'bg-yellow-400 text-black' },
    { flag: SessionFlags.caution, text: 'CAUTION', className: 'bg-yellow-400 text-black' },
    { flag: SessionFlags.yellowWaving, text: 'LOCAL CAUTION — YELLOW WAVING', className: 'bg-yellow-400 text-black' },
    { flag: SessionFlags.yellow, text: 'LOCAL CAUTION', className: 'bg-yellow-400 text-black' },
    { flag: SessionFlags.debris, text: 'DEBRIS ON TRACK', className: 'bg-yellow-300 text-black' },
    { flag: SessionFlags.blue, text: 'BLUE FLAG — CAR BEING LAPPED', className: 'bg-blue-500 text-white' },
    { flag: SessionFlags.randomWaved, text: 'CAUTION LIGHTS FLASHING', className: 'bg-yellow-400 text-black' },
    { flag: SessionFlags.tenToGo, text: 'CAUTION — 10 LAPS TO GREEN', className: 'bg-yellow-400 text-black' },
    { flag: SessionFlags.fiveToGo, text: 'CAUTION — 5 LAPS TO GREEN', className: 'bg-yellow-400 text-black' },
    { flag: SessionFlags.oneLapToGreen, text: 'ONE LAP TO GREEN', className: 'bg-green-500 text-white' },
    { flag: SessionFlags.greenHeld, text: 'GREEN HELD', className: 'bg-green-600 text-white' },
    { flag: SessionFlags.white, text: 'WHITE FLAG — FINAL LAP', className: 'bg-white text-black border border-gray-300' },
    { flag: SessionFlags.checkered, text: 'CHECKERED FLAG', className: 'bg-white text-black border border-gray-300' },
    { flag: SessionFlags.crossed, text: 'CROSSED FLAGS — HALFWAY', className: 'bg-white text-black border border-gray-300' },
    { flag: SessionFlags.green, text: 'GREEN FLAG — TRACK CLEAR', className: 'bg-green-600 text-white' },
    { flag: SessionFlags.startGo, text: 'GO', className: 'bg-green-600 text-white' },
    { flag: SessionFlags.startSet, text: 'GET SET', className: 'bg-yellow-400 text-black' },
    { flag: SessionFlags.startReady, text: 'READY', className: 'bg-yellow-400 text-black' },
    { flag: SessionFlags.startHidden, text: 'STARTING LIGHTS HIDDEN', className: 'bg-gray-800 text-white' },
];

export function convertSessionFlags(flags) {
    if (flags == null || !Number.isFinite(flags) || flags === 0) {
        return {
            text: 'TRACK CLEAR',
            className: 'bg-green-600 text-white',
        };
    }

    for (const { flag, text, className } of FLAG_PRIORITY) {
        if ((flags & flag) !== 0) {
            return { text, className };
        }
    }

    return {
        text: 'UNKNOWN FLAG STATE',
        className: 'bg-gray-500 text-white',
    };
}

// How long a detected local-yellow section stays active after its last
// detection tick before reverting to clear. Telemetry arrives frequently
// (the agent broadcasts at 10Hz), so a single missed or borderline tick
// shouldn't be enough to flicker a section back to green.
const LOCAL_YELLOW_HOLD_MS = 3000;

// iRacing's SplitTimeInfo.Sectors gives the official timing-section
// boundaries (SectorStartPct, ascending starting at 0) but there's no SDK
// field for which section a local yellow is in — this infers it from
// whichever cars currently carry a local-yellow CarIdxSessionFlags bit and
// where their CarIdxLapDistPct falls within those boundaries.
function getSectionBoundaries(session) {
    const sectors = session?.SplitTimeInfo?.Sectors;
    if (!Array.isArray(sectors) || sectors.length === 0) return [0];
    return sectors.map((sector) => sector?.SectorStartPct ?? 0);
}

// boundaries is assumed ascending starting at 0 (iRacing's own ordering) —
// finds the last boundary at or before pct.
function findSectionIndex(pct, boundaries) {
    let index = 0;
    for (let i = 0; i < boundaries.length; i++) {
        if (boundaries[i] <= pct) index = i;
        else break;
    }
    return index;
}

// One tick's worth of per-car scanning: which sections currently have a car
// carrying a local-yellow flag. Only the two local-yellow bits count here —
// full-course caution is handled separately in isFullCourseCaution so a
// global caution (which iRacing may mirror onto every car's
// CarIdxSessionFlags) never gets miscounted as a local yellow.
function collectLocalYellowCars(telemetry, boundaries) {
    const buckets = boundaries.map(() => ({ carIdxs: [], waving: false }));

    const carFlags = telemetry?.CarIdxSessionFlags;
    if (!Array.isArray(carFlags)) return buckets;

    const lapDistPct = telemetry?.CarIdxLapDistPct ?? [];
    const trackSurface = telemetry?.CarIdxTrackSurface ?? [];
    const onPitRoad = telemetry?.CarIdxOnPitRoad ?? [];

    carFlags.forEach((flags, carIdx) => {
        if (flags == null) return;

        const isYellow = (flags & SessionFlags.yellow) !== 0;
        const isYellowWaving = (flags & SessionFlags.yellowWaving) !== 0;
        if (!isYellow && !isYellowWaving) return;

        const pct = lapDistPct[carIdx];
        if (pct == null || !Number.isFinite(pct) || pct < 0) return;
        if (trackSurface[carIdx] === -1) return;
        if (onPitRoad[carIdx]) return;

        const bucket = buckets[findSectionIndex(pct, boundaries)];
        bucket.carIdxs.push(carIdx);
        if (isYellowWaving) bucket.waving = true;
    });

    return buckets;
}

export function isFullCourseCaution(sessionFlags) {
    if (sessionFlags == null || !Number.isFinite(sessionFlags)) return false;
    return (sessionFlags & (SessionFlags.caution | SessionFlags.cautionWaving)) !== 0;
}

// Debounced, per-section local-yellow state — recomputed every render (i.e.
// every telemetry tick), holding each section's warning active for
// LOCAL_YELLOW_HOLD_MS after its last detection so the UI doesn't flicker.
export function useSectionCautionState(session, telemetry) {
    const boundaries = useMemo(
        () => getSectionBoundaries(session),
        [session?.SplitTimeInfo?.Sectors]
    );

    const rawBuckets = useMemo(
        () => collectLocalYellowCars(telemetry, boundaries),
        [
            telemetry?.CarIdxSessionFlags,
            telemetry?.CarIdxLapDistPct,
            telemetry?.CarIdxTrackSurface,
            telemetry?.CarIdxOnPitRoad,
            boundaries,
        ]
    );

    const heldRef = useRef({});
    const now = Date.now();

    const sections = rawBuckets.map((bucket, index) => {
        if (bucket.carIdxs.length > 0) {
            heldRef.current[index] = { at: now, waving: bucket.waving, carIdxs: bucket.carIdxs };
        }

        const held = heldRef.current[index];
        const isActive = held != null && now - held.at < LOCAL_YELLOW_HOLD_MS;

        return {
            section: index + 1,
            status: isActive ? (held.waving ? 'waving' : 'yellow') : 'clear',
            carIdxs: isActive ? held.carIdxs : [],
        };
    });

    const fullCourseCaution = isFullCourseCaution(telemetry?.SessionFlags);
    const localYellowSections = sections.filter((s) => s.status !== 'clear');

    return { sections, fullCourseCaution, localYellowSections };
}

export function formatCautionStripText(fullCourseCaution, localYellowSections) {
    if (fullCourseCaution) return 'FULL COURSE CAUTION';
    if (localYellowSections.length > 0) {
        return `LOCAL YELLOW — ${localYellowSections.map((s) => `SECTION ${s.section}`).join(', ')}`;
    }
    return 'TRACK CLEAR';
}

export function cautionStripClassName(fullCourseCaution, localYellowSections) {
    if (fullCourseCaution) return 'bg-yellow-500 text-black';
    if (localYellowSections.length > 0) return 'bg-yellow-400 text-black';
    return 'bg-green-600 text-white';
}

export function formatTimeRemaining(totalSeconds) {
    if (
        totalSeconds == null ||
        !Number.isFinite(totalSeconds) ||
        totalSeconds < 0
    ) {
        return "—";
    }

    const secondsRemaining = Math.floor(totalSeconds);

    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor(
        (secondsRemaining % 3600) / 60
    );
    const seconds = secondsRemaining % 60;

    return [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        seconds.toString().padStart(2, "0"),
    ].join(":");
}
