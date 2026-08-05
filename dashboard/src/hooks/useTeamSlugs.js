import { useMemo } from 'react';
import { useLiveTeams } from './useLiveTeams';
import { slugify } from '@/lib/slug';

// Maps between the agent's internal teamId (e.g. "car-9" — the real
// identity used for websocket tagging, DB entry_name, session-key scoping)
// and a friendly URL slug derived from the live display name (e.g.
// "road-america"). Keeping these separate means every collector connection
// stays fully isolated — two people spectating the same session each get
// their own teamId/history — while the URL still reads as something
// meaningful, and updates automatically when the underlying race changes
// (see applySessionKey in agent/index.js).
//
// Collisions (two teams landing on the same slug, e.g. same track) are
// resolved deterministically by sorting teamIds first, so every viewer
// computes the same -2/-3 suffixes independently without coordination.
export function useTeamSlugs() {
  const liveTeams = useLiveTeams();

  return useMemo(() => {
    const teamIds = Object.keys(liveTeams).sort();
    const slugToTeamId = {};
    const teamIdToSlug = {};
    const seen = new Set();

    for (const teamId of teamIds) {
      const base = slugify(liveTeams[teamId]?.displayName) || teamId;
      let slug = base;
      let n = 2;
      while (seen.has(slug)) slug = `${base}-${n++}`;
      seen.add(slug);
      slugToTeamId[slug] = teamId;
      teamIdToSlug[teamId] = slug;
    }

    return { liveTeams, slugToTeamId, teamIdToSlug };
  }, [liveTeams]);
}
