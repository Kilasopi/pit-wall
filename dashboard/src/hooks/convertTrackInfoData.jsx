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
