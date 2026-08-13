const cheerio = require('cheerio');

const SPECIAL_EVENTS_URL = "https://www.iracing.com/special-events/";
const NEWS_URL = "https://www.iracing.com/category/news/sim-racing-news/";

// Finds the correct post for the event
function matchNewsPost(eventName, newsIndex) {
    const keyword = eventName
        .toLowerCase()
        .replace(/^\d+\s*(hrs?|hours?|km)?\s*(of)?\s*/i, '')
        .split(/\s+/)[0];
    
    return newsIndex.find((post) => {
        const title = post.title.toLowerCase();
        return title.includes('special event') && title.includes(keyword);
    }) ?? null;
}

// Gets the timeslots from the specific news page
async function fetchTimeslots(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    const heading = $('h3').filter((_, el) => $(el).text().trim().toUpperCase() === 'TIMES TO RACE').first();
    if (heading.length === 0) return [];

    const list = heading.nextAll('ul').first();
    if (list.length === 0) return [];

    const slots = [];
    list.find('li').each((_, li) => {
        const text = $(li).text().trim();
        const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
        if (!timeMatch) return;

        const weekdayMatch = text.match(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/i);

        slots.push({
            weekday: weekdayMatch ? weekdayMatch[1] : null,
            hourUTC: Number(timeMatch[1]),
            minuteUTC: Number(timeMatch[2]),
            broadcast: /broadcast/i.test(text),
            raw: text,
        });
    });

    return slots;
}

// Fetch news post for special event timeslot extraction
async function fetchNewsIndex() {
    const res = await fetch(NEWS_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    const posts = [];
    $('div.clearfix h2.title a').each((_, el) => {
        posts.push({
            title: $(el).text().trim(),
            url: $(el).attr('href'),
        });
    });

    return posts;
}

// Extracts the distance or duration of the event fromthe title and description. Inferred based on title
// Example: Portimao 1000 -> 1000 km
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

// Anchors a slot's weekday + UTC time to an actual date within the event's date range
function resolveTimeslot(dateRange, slot) {
    if (!dateRange) return null;

    const searchEnd = new Date(dateRange.end);
    searchEnd.setUTCDate(searchEnd.getUTCDate() + 1);

    const candidate = new Date(dateRange.start);
    while (candidate <= searchEnd) {
        const weekdayName = candidate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        if (!slot.weekday || weekdayName.toLowerCase() === slot.weekday.toLowerCase()) {
            const result = new Date(candidate);
            result.setUTCHours(slot.hourUTC, slot.minuteUTC, 0, 0);
            return result;
        }
        candidate.setUTCDate(candidate.getUTCDate() + 1);
    }

    return null;
}

// Extracts the dates for when the events are going to be happening
function dateExtraction(section, $) {
    const dateText = $(section).find('h2.wp-block-heading').first().next('p').text().trim();
    const match = dateText.match(/^([A-Za-z]+) (\d{1,2})\s*(?:[-–]\s*(\d{1,2}))?,\s*(\d{4})$/);

    if (!match) return null;
    const [, month, startDay, endDay, year] = match;

    const start = new Date(`${month} ${startDay}, ${year} UTC`);
    const end = new Date(`${month} ${endDay ?? startDay}, ${year} UTC`);

    return { start, end };
}

// Scraper for special events page to list all special event
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

    const newsIndex = await fetchNewsIndex().catch(() => []);

    return Promise.all(events.map(async (event) => {
        const post = matchNewsPost(event.name, newsIndex);
        if (!post) return { ...event, timeslots: [] };

        const slots = await fetchTimeslots(post.url).catch(() => []);
        const timeslots = slots
            .map((slot) => resolveTimeslot(event.dateRange, slot))
            .filter(Boolean)
            .map((d) => d.toISOString());

        return { ...event, timeslots };
    }));
}



module.exports = { fetchSpecialEvents };