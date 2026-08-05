// Turns a display name like "Road America" into a URL-friendly
// "road-america". Falls back to empty string for names that are entirely
// punctuation/whitespace (e.g. non-Latin driver-only labels) — callers
// should fall back to the raw teamId in that case.
export function slugify(name) {
  return (name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
