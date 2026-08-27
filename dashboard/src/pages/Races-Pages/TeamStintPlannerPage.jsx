import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeamEntryDrivers } from '@/hooks/useTeamEntryDrivers';
import { useTeamRoster } from '@/hooks/useTeamRoster';
import { useTeamRaceSettings } from '@/hooks/useTeamRaceSettings';
import { StintGroup } from '@/components/StintGroup';
import { Button } from '@/components/ui/button';
import { useTeamAvailabilityBlocks } from '@/hooks/useTeamAvailabilityBlocks';
import { DriverAvailabilityOverview } from '@/components/DriverAvailabilityOverview';
import { useRaceEventTeams } from '@/hooks/useRaceEventTeams';
import { HelpPopover } from '@/components/HelpPopover';


function TeamStintPlannerPage() {
  const { teamId, raceEventId } = useParams();
  const { token } = useAuth();
  const { data: drivers, loading: driversLoading, refetch: refetchDrivers } = useTeamEntryDrivers(teamId, token);
  const { data: roster, loading: rosterLoading } = useTeamRoster(teamId, token);
  const { data: raceSettings, loading: settingsLoading, save: saveRaceSettings, refetch: refetchSettings } = useTeamRaceSettings(teamId, token);
  const { data: blocks, loading: blocksLoading, refetch: refetchBlocks } = useTeamAvailabilityBlocks(teamId, token);
  const { timeslots } = useRaceEventTeams(raceEventId);

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
    lockedCarName: raceSettings?.locked_car_name ?? null,
    roster,
    drivers,
    raceSettings,
    blocks,
    timeslots,
  };

  function handleChange() {
    refetchDrivers();
    refetchSettings();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1">
        <Link to={`/races/${raceEventId}/racePlanner`}>
          <Button variant="outline" size="sm">← Back to Race Planner</Button>
        </Link>
        <HelpPopover label="How does the stint planner work?">
          <p><strong>Race settings</strong> — race start (UTC), length, practice/quali length, and who's qualifying all live at the top. Setting a start and length is what unlocks the schedule and availability overview below.</p>
          <p className="mt-2"><strong>Schedule</strong> — click "Add Stint" under a driver to give them a slot; drag rows to reorder. Consecutive stints by the same driver auto-group into a "Double Stint" block.</p>
          <p className="mt-2"><strong>Availability overview</strong> — one lane per driver across the whole race. Colored blocks are their assigned stints; red/yellow blocks are their Blackout/Avoid times. Click a red/yellow block to edit it, or the + next to a name to add a new one.</p>
          <p className="mt-2">A red "Blackout conflict" badge on a stint row means that driver is scheduled during their own blackout — it's a warning, not a hard stop, so the schedule still works; just adjust the stint or the block.</p>
        </HelpPopover>
      </div>
      <DriverAvailabilityOverview group={group} token={token} onChange={refetchBlocks} />
      <StintGroup group={group} onChange={handleChange} saveRaceSettings={saveRaceSettings} />
    </div>
  );
}

export default TeamStintPlannerPage;