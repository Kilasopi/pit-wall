// Fetches the real track outline (an SVG path) from iRacing's Data API and
// caches it to disk, so we don't hit the API more than once per track ever.
//
// The Data API's two-step pattern: GET a data endpoint -> {link: <signed S3
// URL>} -> GET that link for the real JSON. Auth is a cookie obtained by
// POSTing a salted hash of the password (see hashPassword below).
//
// /auth used to accept this as JSON directly; as of the iRacing Season 3
// auth changes it now 405s there (that path serves the member site's SPA
// login page instead) and expects form-encoded credentials at /authenticate.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUTH_URL = 'https://members-ng.iracing.com/auth';
const AUTH_FORM_URL = 'https://members-ng.iracing.com/authenticate';
const TRACK_ASSETS_URL = 'https://members-ng.iracing.com/data/track/assets';
const CACHE_DIR = path.join(__dirname, 'data', 'trackmaps');

function hashPassword(password, email) {
    return crypto
        .createHash('sha256')
        .update(password + email.toLowerCase())
        .digest('base64');
}

class TrackMapService {
    constructor({ iracingEmail, iracingPassword }) {
        this._email = iracingEmail;
        this._password = iracingPassword;
        this._cookie = null;
        this._trackAssets = null;
        this._pathCache = new Map();
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    async _authenticate() {
        if (!this._email || !this._password) {
            throw new Error('IRACING_EMAIL/IRACING_PASSWORD not configured');
        }

        const credentials = {
            email: this._email,
            password: hashPassword(this._password, this._email),
        };

        let res = await fetch(AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'pit-wall-agent/1.0',
            },
            body: JSON.stringify(credentials),
        });

        // /auth 405s under the current auth flow; fall back to the
        // form-encoded /authenticate endpoint it now expects.
        if (res.status === 405) {
            res = await fetch(AUTH_FORM_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'pit-wall-agent/1.0',
                },
                body: new URLSearchParams(credentials).toString(),
            });
        }

        if (!res.ok) {
            const body = await res.text().catch(() => '<no body>');
            throw new Error(`iRacing auth failed: ${res.status} — ${body.slice(0, 500)}`);
        }

        const setCookie = res.headers.getSetCookie?.() ?? [];
        this._cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
    }

    async _dataApiGet(url, { retried = false } = {}) {
        const res = await fetch(url, { headers: { Cookie: this._cookie ?? '' } });

        if ((res.status === 401 || res.status === 403) && !retried) {
            await this._authenticate();
            return this._dataApiGet(url, { retried: true });
        }
        if (!res.ok) {
            throw new Error(`iRacing data API error ${res.status} for ${url}`);
        }

        const body = await res.json();
        if (body?.link) {
            const linked = await fetch(body.link);
            if (!linked.ok) {
                throw new Error(`iRacing data API S3 link error ${linked.status}`);
            }
            return linked.json();
        }
        return body;
    }

    async _getTrackAssets() {
        if (this._trackAssets) return this._trackAssets;
        if (!this._cookie) await this._authenticate();
        this._trackAssets = await this._dataApiGet(TRACK_ASSETS_URL);
        return this._trackAssets;
    }

    _cacheFile(trackId) {
        return path.join(CACHE_DIR, `${trackId}.json`);
    }

    // Returns an SVG path `d` string for the track's active surface outline,
    // or null if the track ID isn't known / has no map asset.
    async getTrackPath(trackId) {
        if (trackId == null) return null;
        if (this._pathCache.has(trackId)) return this._pathCache.get(trackId);

        const cacheFile = this._cacheFile(trackId);
        if (fs.existsSync(cacheFile)) {
            const { path: cachedPath } = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
            this._pathCache.set(trackId, cachedPath);
            return cachedPath;
        }

        const assets = await this._getTrackAssets();
        const asset = assets?.[trackId];
        const activeLayer = asset?.track_map_layers?.active;
        if (!asset?.track_map || !activeLayer) return null;

        const svgRes = await fetch(`${asset.track_map}${activeLayer}`);
        if (!svgRes.ok) return null;
        const svgText = await svgRes.text();

        const match = svgText.match(/<path[^>]*\sd="([^"]+)"/);
        if (!match) return null;

        // Track outline SVGs are a single closed path; drop anything after
        // the first close command in case the source has stray artifacts.
        const activePath = `${match[1].split(/[zZ]/)[0].replace(/\s+/g, ' ').trim()}Z`;

        fs.writeFileSync(cacheFile, JSON.stringify({ path: activePath }));
        this._pathCache.set(trackId, activePath);
        return activePath;
    }
}

module.exports = { TrackMapService, hashPassword };
