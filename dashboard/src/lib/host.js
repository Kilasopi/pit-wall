// One dashboard container answers both public hostnames (see
// relay/config.yml ingress rules) — routing between the crew pages and
// the family-facing spectate page happens client-side by hostname rather
// than by deploying two separate builds.
export function isSpectateHost() {
  return window.location.hostname.startsWith('spectate.');
}
