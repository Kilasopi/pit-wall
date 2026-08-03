import { Routes, Route } from 'react-router-dom';
import { useAgentSocket } from '@/hooks/useAgentSocket';
import { NavBar } from '@/components/NavBar';
import { RaceViewNav } from '@/components/RaceViewNav';
import { ThresholdAlertBanner } from '@/components/ThresholdAlertBanner';
import { Badge } from '@/components/ui/badge';
import PitWall from './RaceView-Pages/PitWall.jsx';
import Leaderboard from './RaceView-Pages/Leaderboard.jsx';
import CarInfo from './RaceView-Pages/CarInfo.jsx';
import TrackInfo from './RaceView-Pages/TrackInfo.jsx';
import Strategy from './RaceView-Pages/Strategy.jsx';

// Owns the one live WebSocket connection for this whole section — Pit
// Wall/Car Info/Track Info all read it via props instead of each calling
// useAgentSocket() themselves, which would open a separate socket per page.
function RaceView() {
  const agent = useAgentSocket();

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-heading font-medium">Pit Wall</h1>
        <Badge variant={agent.connected ? 'default' : 'destructive'}>
          {agent.connected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      <NavBar />
      <RaceViewNav />
      <ThresholdAlertBanner fuel={agent.fuel} />

      <Routes>
        <Route index element={<PitWall {...agent} />} />
        <Route path="leaderboard" element={<Leaderboard {...agent} />} />
        <Route path="carinfo" element={<CarInfo {...agent} />} />
        <Route path="trackinfo" element={<TrackInfo {...agent} />} />
        <Route path="strategy" element={<Strategy {...agent} />} />
      </Routes>
    </div>
  );
}

export default RaceView;
