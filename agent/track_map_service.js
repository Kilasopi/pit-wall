// The real track outline (an SVG path) would ideally come from iRacing's own
// Data API (track/assets), but that requires an OAuth client registration
// and iRacing has paused issuing new ones (see README's "Track map caveat").
// Until that reopens, track shapes are served from a bundled dataset instead
// — see data/track_info.json, data/LICENSE (from iRaceHUD, GPLv3) — so any
// track missing from that snapshot just falls back to no map (handled by
// TrackMapCard).
const trackInfoData = require('./data/track_info.json');
const trackSettingsData = require('./data/track_settings.json');
class TrackMapService {

    // Returns an SVG path `d` string for the track's active surface outline,
    // or null if the track ID isn't known / has no map asset.
    getTrackPath(trackId) {
        if (trackId == null) return null;
        const track = trackInfoData[trackId];
        return track ? track.activePath : null;
    }

    getTrackSettings(trackId){
        if (trackId == null) return null;
        const settings = trackSettingsData[trackId];
        return {
            direction: settings ? settings.direction : null,
            offset: settings ? settings.offset : null,
        }
    }
}

module.exports = { TrackMapService };
