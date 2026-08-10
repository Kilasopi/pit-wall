const { PDFParse } = require("pdf-parse");

function extractDuration(blockLines) {
    const durations = [];
    blockLines.forEach((line, index) => {
        if (line === "mins") {
            const minutes = parseInt(blockLines[index - 1],10);
            durations.push(minutes);
        }
    });
    return durations;
}

function qualifies(durations) {
    return durations.some((minutes) => minutes >= 160);
}

function parseCadence(headerLine) {
    const biweekly = headerLine.includes("every other");

    const dayGroupPattern = /(Saturdays?|Sundays?)(.*?)GMT/g;
    const groups = [];

    let match;
    while ((match = dayGroupPattern.exec(headerLine)) !== null) {
        const day = match[1];
        const chunk = match[2];
        const times = chunk.match(/\d{1,2}(:\d{2})?/g) || [];
        groups.push({ day, times });
    } 

    return { biweekly, groups };
}

function extractCarClasses(block) {
    const endIndex = block.findIndex((line) => line.includes("-->"));
    const carListLines = block.slice(1, endIndex);
    const carListText = joinWrappedLines(carListLines);
    return carListText.split(",").map((car) => car.trim()).filter(Boolean);
}

function joinWrappedLines(lines) {
    return lines.reduce((text, line) => {
        if (text.endsWith("-")) {
            return text + line;
        }
        return text ? text + " " + line : line;
    }, "");
}

function extractWeeks(block, series) {
    const weeks = []
    const weekIndexes = [];

    block.forEach((line, i) => {
        if (line.match(/^Week \d+ \(\d{4}-\d{2}-\d{2}\)/)) {
            weekIndexes.push(i);
        }
    });

    const weekBlocks = weekIndexes.map((startIndex, i) => {
    const endIndex = weekIndexes[i + 1];
        return block.slice(startIndex, endIndex);
    });

    weekBlocks.forEach((weekBlock,i) => {
        const weeksLine = weekBlock[0].match(/^Week (\d+) \((\d{4}-\d{2}-\d{2})\) (.+)$/);
        if (weeksLine) {
            const durations = extractDuration(weekBlock);
            weeks.push({
                series,
                week: Number(weeksLine[1]),
                anchorDate:weeksLine[2],
                track:weeksLine[3],
                lengthMinutes: durations[0]
            });
        }
    });

    return weeks;
}

function resolveDate(anchorDate, targetDayName) {
    const dayNumbers = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

    const date = new Date(anchorDate);
    const anchorDay = date.getUTCDay();

    const normalized = targetDayName.endsWith("s") ? targetDayName.slice(0,-1) : targetDayName;
    const targetDay = dayNumbers[normalized];

    const offset = (targetDay - anchorDay + 7) % 7;
    date.setUTCDate(date.getUTCDate() + offset);
    return date;
}

function buildTimeStamp(date, timeString) {
    const [hours , minutes] = timeString.split(":").map(Number);
    const timestamp = new Date(date);
    timestamp.setUTCHours(hours, minutes || 0, 0, 0);
    return timestamp;
}

async function fetchScheduleEvents() {

    const response = await fetch("https://members-assets.iracing.com/public/schedulepdf/SeasonSchedule.pdf");
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parser = new PDFParse({data : buffer });
    const result = await parser.getText();

    const lines = result.text.split("\n");
    const start = lines.indexOf("SPORTS CAR");
    const end= lines.indexOf("FORMULA CAR");

    const sportsCarLines = lines.slice(start,end);

    const results = []

    const titleIndexes = [];
    sportsCarLines.forEach((line, index) => {
        if (line.includes("2026 Season")) {
            titleIndexes.push(index);
        }
    });

    const blocks = titleIndexes.map((startIndex, i) => {
        const endIndex = titleIndexes[i + 1];
        return sportsCarLines.slice(startIndex,endIndex);
    });

    blocks.forEach((block) => {
        const durations = extractDuration(block);
        const carClasses = extractCarClasses(block);
        
        if (qualifies(durations)) {
            const seriesName = block[0].replace(/\s*-?\s*2026 Season.*$/, "");

            const events = extractWeeks(block, seriesName);

            const cadenceLine = block.find(line => line.startsWith("Races "));
            const parsedCadence = parseCadence(cadenceLine);

            const raceEvents = events.map((event) => {
                const timeslots = [];

                parsedCadence.groups.forEach((group) => {
                    const date = resolveDate(event.anchorDate, group.day);
                    group.times.forEach((time) => {
                        timeslots.push(buildTimeStamp(date, time));
                    });
                });

                return {
                    week: event.week,
                    track: event.track,
                    lengthMinutes: event.lengthMinutes,
                    timeslots,
                };
            });

            results.push({ name: seriesName, source: 'schedule_pdf', carClasses, events: raceEvents });

        }
    });
    return results;
}

module.exports = { fetchScheduleEvents };