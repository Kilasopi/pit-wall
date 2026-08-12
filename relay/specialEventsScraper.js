const cheerio = require('cheerio');

const SPECIAL_EVENTS_URL = "https://www.iracing.com/special-events/";

function extractDistanceOrDuration(name, descriptionText) {
    const hoursPattern = /(\d+)[\s-]*(?:Hours?|HR)\b/i;
    const kmPattern = /(\d[\d,]*)\s*km\b/i;

    const hoursMatch = name.match(hoursPattern);
    if (hoursMatch) {
        return { lengthMinutes: Number(hoursMatch[1]) * 60, distanceKm: null };
    }

    const kmMatch = name.match(kmPattern);
    if (kmMatch) {
        return { lengthMinutes: null, distanceKm: Number(kmMatch[1].replace(/,/g, '')) };
    }

    const hoursDescMatch = descriptionText.match(hoursPattern);
    if (hoursDescMatch) {
        return { lengthMinutes: Number(hoursDescMatch[1]) * 60, distanceKm: null };
    }

    const kmDescMatch = descriptionText.match(kmPattern);
    if (kmDescMatch) {
        return { lengthMinutes: null, distanceKm: Number(kmDescMatch[1].replace(/,/g, '')) };
    }

    const bareNumberMatch = name.match(/(\d[\d,]*)\s*$/);
    if (bareNumberMatch) {
        return { lengthMinutes: null, distanceKm: Number(bareNumberMatch[1].replace(/,/g, '')) };
    }

    return { lengthMinutes: null, distanceKm: null };

}

function dateExtraction(section, $) {
    const dateText = $(section).find('h2.wp-block-heading').first().next('p').text().trim();
    const match = dateText.match(/^([A-Za-z]+) (\d{1,2})\s*(?:[-–]\s*(\d{1,2}))?,\s*(\d{4})$/);

    if (!match) return null;
    const [, month, startDay, endDay, year] = match;

    const start = new Date(`${month} ${startDay}, ${year} UTC`);
    const end = new Date(`${month} ${endDay ?? startDay}, ${year} UTC`);

    return { start, end };
}

async function fetchSpecialEvents(){
    const res = await fetch(SPECIAL_EVENTS_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });
        
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const html = await res.text();

    const completedIdx = html.indexOf('id="completed-events"');
    const upcomingHtml = completedIdx === -1 ? html : html.slice(0, completedIdx);

    const $ = cheerio.load(upcomingHtml);

    const events = [];
    const seen = new Set();
    
    $('section.wp-block-cover[id]').each((_, section) => {
        const eyebrowLabel = $(section).find('h2.wp-block-heading').first().prev('p').text().trim();
        if (eyebrowLabel !== 'TEAM EVENT') return;
        const name = $(section).find('h2.wp-block-heading').first().text().trim();
        if (!name || seen.has(name)) return;

        seen.add(name);

        const descriptionText = $(section).find('h2.wp-block-heading').first().next('p').next('p').text().trim();
        const { lengthMinutes, distanceKm } = extractDistanceOrDuration(name, descriptionText);

        const dateRange = dateExtraction(section, $);
        events.push({ name, lengthMinutes, distanceKm, dateRange });
    });

    return events;
}

module.exports = { fetchSpecialEvents };