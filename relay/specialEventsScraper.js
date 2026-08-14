const cheerio = require('cheerio');

const SPECIAL_EVENTS_URL = "https://www.iracing.com/special-events/";
const NEWS_URL = "https://www.iracing.com/category/news/sim-racing-news/";

// Car-class keywords that mark an oval/dirt discipline, used to exclude
// non-road-course special events (see NON_ROAD_COURSE_PATTERN usage below).
const NON_ROAD_COURSE_PATTERN = /NASCAR|Sprint Car|Dirt|Midget|Late Model|Off-Road|Oval|Truck|Rallycross/i;

// Manual overrides on top of the discipline heuristic — some events don't
// interest this team regardless of discipline (excluded), and some ovals
// are wanted anyway (included). Matched case-insensitively, exact name.
const EXCLUDED_EVENT_NAMES = ['Dale Jr Charity Event', 'SCCA Runoffs', 'SFL Mountain Showdown'];
const INCLUDED_OVAL_EVENT_NAMES = ['Daytona 500', 'INDY 500'];

// Finds the correct post for the event
function matchNewsPost(eventName, newsIndex) {
    // Every news post title is "THIS WEEK: iRacing X | Special Event", so a
    // leading "iRacing"/"THE"/etc on the event name would produce a keyword
    // generic enough to match literally every post — strip those first.
    const keyword = eventName
        .toLowerCase()
        .replace(/^(the|a|an)\s+/i, '')
        .replace(/^iracing\s+/i, '')
        .replace(/^\d+\s*(hrs?|hours?|km)?\s*(of)?\s*/i, '')
        .split(/\s+/)[0];

    if (!keyword) return null;

    return newsIndex.find((post) => {
        const title = post.title.toLowerCase();
        return title.includes('special event') && title.includes(keyword);
    }) ?? null;
}

// Parses the "TIMES TO RACE" heading + following <ul> into raw timeslots
function extractTimeslots($) {
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

// Parses the "CARS AND CLASSES COMPETING" heading into a flat list of car
// names (spanning every class listed) — same shape as race_series.car_classes
// already stores for the regular schedule, so downstream class-derivation
// logic doesn't need a special case for special events.
function extractCarNames($) {
    const heading = $('h3').filter((_, el) => /CARS AND CLASSES/i.test($(el).text())).first();
    if (heading.length === 0) return [];

    const cars = [];
    let node = heading.next();
    while (node.length && !node.is('h3')) {
        if (node.is('ul')) {
            node.find('li').each((_, li) => cars.push($(li).text().trim()));
        }
        node = node.next();
    }

    return cars;
}

// Fetches a special event's news post once and parses both its timeslots
// and its car list out of the same page load.
async function fetchArticleDetails(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    return {
        slots: extractTimeslots($),
        carNames: extractCarNames($),
        track: extractTrackFromArticle($),
    };
}

// Parses the "Cars Competing" <details><summary> text already present in
// each event's own section on the special-events listing page (no extra
// fetch needed). Format is inconsistent across events — "HPD // GT1 //
// GT2", "GT3 Class \ GT4 Class", "GTP // LMP2 // GT3 (IMSA)" — so this
// splits on the separators, strips parenthetical notes and the word
// "Class(es)", and returns whatever fragments are left. Available for
// every event regardless of whether its news post exists yet, unlike
// the timeslot/car-name extraction which needs a matched post.
function extractCarClassFragments(section, $) {
    const summary = $(section).find('details summary').first().text().trim();
    if (!summary) return [];

    return summary
        .split(/\s*(?:\/\/|\\)\s*/)
        .map((part) => part.replace(/\([^)]*\)/g, '').replace(/\bclass(es)?\b/gi, '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
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

// News-post track headings are often ALL CAPS ("ALGARVE INTERNATIONAL
// CIRCUIT – GRAND PRIX"); title-case them for display. Leaves anything
// already mixed-case alone (e.g. listing-page names are fine as-is).
function normalizeTrackName(track) {
    if (!track || track !== track.toUpperCase()) return track;
    return track.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Track name from the listing page's description paragraph — the track
// is usually a link to /tracks/{slug}/, but not always (e.g. Suzuka
// mentions it as plain prose: "held at the Suzuka Circuit in Japan").
// Falls back to a regex looking for "at (the) <Name> Circuit/Raceway/
// Speedway" when there's no link. Some events don't mention a track at
// all until their news post exists — both tiers return null then.
const TRACK_PROSE_PATTERN = /\bat (?:the )?([A-Z][A-Za-z0-9'.\-\s]*?(?:Circuit|Raceway|Speedway))\b/;

function extractTrackFromListing(section, $) {
    const descP = $(section).find('h2.wp-block-heading').first().next('p').next('p');
    const link = descP.find('a[href*="/tracks/"]').first();
    if (link.length > 0) return link.text().trim();

    const proseMatch = descP.text().match(TRACK_PROSE_PATTERN);
    return proseMatch ? proseMatch[1].trim() : null;
}

// Track name from the news post's "TRACK: NAME" heading — richer than the
// listing page since it includes the layout (e.g. "– Grand Prix").
function extractTrackFromArticle($) {
    const heading = $('h3').filter((_, el) => /^TRACK:/i.test($(el).text().trim())).first();
    if (heading.length === 0) return null;

    const strong = heading.find('strong').first();
    const raw = (strong.length > 0 ? strong.text() : heading.text().replace(/^TRACK:\s*/i, '')).trim();
    return normalizeTrackName(raw);
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
        const name = $(section).find('h2.wp-block-heading').first().text().trim();
        const summary = $(section).find('details summary').first().text().trim();

        if (!name || seen.has(name)) return;

        // Both solo and team special events are in scope, but oval/dirt
        // disciplines aren't — this app only cares about road course
        // racing. There's no structural "road course" marker on the page,
        // so this infers discipline from the car class summary text, with
        // manual overrides for the cases that heuristic gets wrong.
        const isExcluded = EXCLUDED_EVENT_NAMES.some((n) => n.toLowerCase() === name.toLowerCase());
        const isIncludedOval = INCLUDED_OVAL_EVENT_NAMES.some((n) => n.toLowerCase() === name.toLowerCase());
        if (isExcluded) return;
        if (!isIncludedOval && NON_ROAD_COURSE_PATTERN.test(summary)) return;

        seen.add(name);

        const descriptionText = $(section).find('h2.wp-block-heading').first().next('p').next('p').text().trim();
        const { lengthMinutes, distanceKm } = extractDistanceOrDuration(name, descriptionText);

        const dateRange = dateExtraction(section, $);
        const classFragments = extractCarClassFragments(section, $);
        const trackFromListing = extractTrackFromListing(section, $);
        events.push({ name, lengthMinutes, distanceKm, dateRange, classFragments, trackFromListing });
    });

    const newsIndex = await fetchNewsIndex().catch(() => []);

    return Promise.all(events.map(async ({ classFragments, trackFromListing, ...event }) => {
        const post = matchNewsPost(event.name, newsIndex);
        if (!post) {
            return { ...event, timeslots: [], carClasses: classFragments.length > 0 ? classFragments : null, track: trackFromListing };
        }

        const { slots, carNames, track } = await fetchArticleDetails(post.url).catch(() => ({ slots: [], carNames: [], track: null }));
        const timeslots = slots
            .map((slot) => resolveTimeslot(event.dateRange, slot))
            .filter(Boolean)
            .map((d) => d.toISOString());

        const carClasses = carNames.length > 0 ? carNames : (classFragments.length > 0 ? classFragments : null);
        return { ...event, timeslots, carClasses, track: track ?? trackFromListing };
    }));
}



module.exports = { fetchSpecialEvents };