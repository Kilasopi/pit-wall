import { useEffect, useRef, useState } from 'react';
import { Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAgentSocket } from '@/hooks/useAgentSocket';
import { useTeamSlugs } from '@/hooks/useTeamSlugs';
import { isSpectateHost } from '@/lib/host';
import { NavBar } from '@/components/NavBar';
import { RaceViewNav } from '@/components/RaceViewNav';
import { ThresholdAlertBanner } from '@/components/ThresholdAlertBanner';
import { PitwallTitle } from '@/components/PitwallTitle';
import PitWall from './RaceView-Pages/PitWall.jsx';
import Leaderboard from './RaceView-Pages/Leaderboard.jsx';
import CarInfo from './RaceView-Pages/CarInfo.jsx';
import TrackInfo from './RaceView-Pages/TrackInfo.jsx';
import Strategy from './RaceView-Pages/Strategy.jsx';
import Spectate from './Spectate.jsx'

// Owns the one live WebSocket connection for this whole section — Pit
// Wall/Car Info/Track Info all read it via props instead of each calling
// useAgentSocket() themselves, which would open a separate socket per page.
//
// The URL segment is a friendly slug (e.g. "road-america"), not the
// agent's real teamId (e.g. "car-9") — see useTeamSlugs. Resolved once and
// "pinned" for the life of this view: renaming the pitwall changes its
// slug, which would otherwise make the URL param stop matching anything
// and boot the viewer to a dead page. Instead we keep the same underlying
// connection and just push the new slug into the address bar to follow it.
function RaceView() {
  const { teamId: slugParam } = useParams();
  const { slugToTeamId, teamIdToSlug } = useTeamSlugs();
  const navigate = useNavigate();

  const [teamId, setTeamId] = useState(() => slugToTeamId[slugParam] ?? slugParam);

  useEffect(() => {
    const resolved = slugToTeamId[slugParam];
    if (resolved && resolved !== teamId) {
      // The URL points at a different, currently-live pitwall — a real
      // navigation (e.g. clicked a different card), not just our own slug
      // drifting after a rename. Switch to it.
      setTeamId(resolved);
      return;
    }
    // Otherwise, if our pinned team's slug has moved on since we started
    // watching it (i.e. it got renamed), follow along in the address bar
    // without touching the connection itself.
    const currentSlug = teamIdToSlug[teamId];
    if (currentSlug && currentSlug !== slugParam) {
      navigate(`/t/${encodeURIComponent(currentSlug)}`, { replace: true });
    }
  }, [slugParam, slugToTeamId, teamIdToSlug, teamId, navigate]);

  const agent = useAgentSocket(teamId);

  // Only redirect on a true->false transition, not on initial load before
  // the agent has reported real status — otherwise every fresh page load
  // would bounce straight back to "/" before inIracingSession has had a
  // chance to arrive.
  const wasInSessionRef = useRef(false);
  useEffect(() => {
    if (agent.inIracingSession) {
      wasInSessionRef.current = true;
    } else if (wasInSessionRef.current) {
      navigate('/', { replace: true });
    }
  }, [agent.inIracingSession, navigate]);

  if (!slugParam) return <Navigate to="/" replace />;

  // Crew pages (Pit Wall, Leaderboard, strategy, etc.) live only on
  // pitwall.murder-pitwall.com; the family-facing Spectate page only on
  // spectate.murder-pitwall.com — each hostname redirects a stray path on
  // the other into its one allowed page rather than exposing both.
  const spectateHost = isSpectateHost();

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      {!spectateHost && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <PitwallTitle
              teamId={teamId}
              displayName={agent.displayName}
              renamePitwall={agent.renamePitwall}
            />
          </div>
          <NavBar />
          <RaceViewNav teamId={slugParam} />
          <ThresholdAlertBanner fuel={agent.fuel} />
        </>
      )}

      {spectateHost ? (
        <Routes>
          <Route path="spectate" element={<Spectate {...agent} />} />
          <Route
            path="*"
            element={<Navigate to={`/t/${encodeURIComponent(slugParam)}/spectate`} replace />}
          />
        </Routes>
      ) : (
        <Routes>
          <Route index element={<PitWall {...agent} />} />
          <Route path="leaderboard" element={<Leaderboard {...agent} />} />
          <Route path="carinfo" element={<CarInfo {...agent} />} />
          <Route path="trackinfo" element={<TrackInfo {...agent} />} />
          <Route path="strategy" element={<Strategy {...agent} />} />
          <Route
            path="spectate"
            element={<Navigate to={`/t/${encodeURIComponent(slugParam)}`} replace />}
          />
        </Routes>
      )}
    </div>
  );
}

export default RaceView;
