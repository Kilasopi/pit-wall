import { useAgentSocket } from '@/hooks/useAgentSocket';
import { useTeamSlugs } from '@/hooks/useTeamSlugs';
import Spectate from './Spectate.jsx';

// spectate.murder-pitwall.com's "/" — no team picker, no crew chrome,
// just Spectate.jsx itself. Auto-follows whichever pitwall is live
// (sorted so multiple viewers land on the same one deterministically);
// with none live, Spectate still renders and shows its own placeholders.
function SpectateRoot() {
  const { liveTeams } = useTeamSlugs();
  const teamId = Object.keys(liveTeams).sort()[0];
  const agent = useAgentSocket(teamId);

  return <Spectate {...agent} />;
}

export default SpectateRoot;
