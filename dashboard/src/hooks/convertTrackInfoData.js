export function convertSkies(skies) {
    switch (skies) {
        case 0:
            return 'Clear';
        case 1:
            return 'Partly Cloudy';
        case 2:
            return 'Mostly Cloudy';
        case 3:
            return 'Overcast';
        default:
            return 'Unknown';
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