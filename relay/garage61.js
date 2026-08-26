const { AuthorizationCode } = require('simple-oauth2');

const client = new AuthorizationCode({
    client: {
        id: process.env.GARAGE61_CLIENT_ID,
        secret: process.env.GARAGE61_CLIENT_SECRET,
    },
    auth: {
        tokenHost: 'https://garage61.net',
        tokenPath: '/api/oauth/token',
        authorizeHost: 'https://garage61.net',
        authorizePath: '/app/account/oauth',
    },
});

const REDIRECT_URI = process.env.GARAGE61_REDIRECT_URI; // e.g. https://<host>/api/garage61/callback

function getAuthorizationUrl(state) {
    return client.authorizeURL({
        redirect_uri: REDIRECT_URI,
        scope: 'driving_data',
        state,
    });
}

async function exchangeCode(code) {
    const accessToken = await client.getToken({
        code,
        redirect_uri: REDIRECT_URI,
    });
    return accessToken.token; // { access_token, refresh_token, expires_at, ... }
}

// Refreshes if within 60s of expiry, else returns the existing token unchanged.
async function ensureFreshToken(pool, driverId, tokens) {
    const expiresAt = new Date(tokens.garage61_token_expires_at);
    if (expiresAt.getTime() - Date.now() > 60_000) return tokens.garage61_access_token;

    const accessToken = client.createToken({
        access_token: tokens.garage61_access_token,
        refresh_token: tokens.garage61_refresh_token,
        expires_at: expiresAt,
    });
    const refreshed = await accessToken.refresh();

    await pool.query(
        `UPDATE murder_drivers
         SET garage61_access_token = $1, garage61_refresh_token = $2, garage61_token_expires_at = $3
         WHERE id = $4`,
        [refreshed.token.access_token, refreshed.token.refresh_token, refreshed.token.expires_at, driverId]
    );
    return refreshed.token.access_token;
}

module.exports = { getAuthorizationUrl, exchangeCode, ensureFreshToken };