import { Link } from 'react-router-dom';
import { NavBar } from '@/components/NavBar';
import { useTeamSlugs } from '@/hooks/useTeamSlugs';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

// Landing page: which pitwall's live view to open. A pitwall exists the
// moment a collector connects and resolves to a team — see
// useLiveTeams/agent/index.js resolveTeamId — not because someone added a
// roster row on the Drivers page (that's for stint-planner/driver
// management only, see issue #11). Links use a friendly slug
// (useTeamSlugs) rather than the raw teamId (e.g. "car-9") — teamId stays
// the real identity behind the scenes.
function TeamSelectPage() {
  const { liveTeams, teamIdToSlug } = useTeamSlugs();

  // Both, not just collectorConnected — the collector app can stay running
  // (still connected to the agent) after you exit the iRacing session
  // itself, and the pitwall should close in that case too.
  const teams = Object.entries(liveTeams)
    .filter(([, state]) => state.collectorConnected && state.iracingConnected)
    .map(([teamId, state]) => ({ teamId, slug: teamIdToSlug[teamId], ...state }))
    .sort((a, b) => a.teamId.localeCompare(b.teamId));

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-heading font-medium">Pit Wall</h1>
      </div>

      <NavBar />

      <Card>
        <CardHeader>
          <CardTitle>Live pitwalls</CardTitle>
          <CardDescription>One card per currently-connected collector</CardDescription>
        </CardHeader>
      </Card>

      {teams.length > 0 && (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {teams.map(({ teamId, slug, iracingConnected, displayName }) => (
            <Link key={teamId} to={`/t/${encodeURIComponent(slug)}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader>
                  <CardTitle>{displayName ?? teamId}</CardTitle>
                  <CardDescription>
                    {iracingConnected ? 'In iRacing session' : 'Waiting for iRacing'}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {teams.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No collectors connected yet — start one on a Sim PC and its pitwall will show up here.
        </p>
      )}
    </div>
  );
}

export default TeamSelectPage;
