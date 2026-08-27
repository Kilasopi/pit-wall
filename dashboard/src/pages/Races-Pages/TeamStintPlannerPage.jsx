import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeamEntryDrivers } from '@/hooks/useTeamEntryDrivers';
import { useTeamRoster } from '@/hooks/useTeamRoster';
import { useTeamRaceSettings } from '@/hooks/useTeamRaceSettings';
import { StintGroup } from '@/components/StintGroup';
import { Button } from '@/components/ui/button';
import { useTeamAvailabilityBlocks } from '@/hooks/useTeamAvailabilityBlocks';


function TeamStintPlannerPage() {
  const { teamId, raceEventId } = useParams();
  const { token } = useAuth();
  const { data: drivers, loading: driversLoading, refetch: refetchDrivers } = useTeamEntryDrivers(teamId, token);
  const { data: roster, loading: rosterLoading } = useTeamRoster(teamId, token);
  const { data: raceSettings, loading: settingsLoading, save: saveRaceSettings, refetch: refetchSettings } = useTeamRaceSettings(teamId, token);
  const { data: blocks, loading: blocksLoading } = useTeamAvailabilityBlocks(teamId, token);

  if (driversLoading || rosterLoading || settingsLoading || blocksLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (roster.length === 0) {
    return <p className="text-sm text-muted-foreground">No drivers on this team yet.</p>;
  }

  const group = {
    key: teamId,
    teamId,
    eventName: drivers[0]?.event_name ?? raceSettings?.name,
    entryName: raceSettings?.name,
    carType: drivers[0]?.car_type ?? raceSettings?.car_class ?? null,
    roster,
    drivers,
    raceSettings,
    blocks,
  };

  function handleChange() {
    refetchDrivers();
    refetchSettings();
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to={`/races/${raceEventId}/racePlanner`}>
        <Button variant="outline" size="sm">← Back to Race Planner</Button>
      </Link>
      <StintGroup group={group} onChange={handleChange} saveRaceSettings={saveRaceSettings} />
    </div>
  );
}

export default TeamStintPlannerPage;