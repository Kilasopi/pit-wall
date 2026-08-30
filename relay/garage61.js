function getAccessToken(){
    return process.env.GARAGE61_ACCESS_TOKEN;
}

let _trackIdCache = null;
let _trackIdCacheFetchedAt = 0;
const TRACK_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 1 month

async function getGarage61TrackId(iracingTrackId) {
    if (iracingTrackId == null) return null;

    const isStale = Date.now() - _trackIdCacheFetchedAt > TRACK_CACHE_TTL_MS;
    if (!_trackIdCache || isStale) {
        const res = await fetch('https://garage61.net/api/v1/tracks', {
            headers: { Authorization: `Bearer ${getAccessToken()}` },
        });
        const { items } = await res.json();
        _trackIdCache = new Map(
            items
                .filter((t) => t.platform === 'iracing')
                .map((t) => [String(t.platform_id), t.id])
        );
        _trackIdCacheFetchedAt = Date.now();
    }

    return _trackIdCache.get(String(iracingTrackId)) ?? null;
}

module.exports = { getAccessToken, getGarage61TrackId };