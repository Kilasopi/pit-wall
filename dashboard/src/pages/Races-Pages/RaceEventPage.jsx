import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { NavBar } from '@/components/NavBar';
import { RaceEventNav } from '@/components/RaceEventNav';
import RacePlanner from './RacePlanner.jsx';
import TeamStintPlannerPage from './TeamStintPlannerPage.jsx';
import RaceHelpPage from './RaceHelpPage.jsx';

function RaceEventPage() {
  const { raceEventId } = useParams();

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-heading font-medium">Race Event</h1>
      </div>
      <NavBar />
      <RaceEventNav raceEventId={raceEventId} />

      <Routes>
        <Route index element={<Navigate to="racePlanner" replace />} />
        <Route path="racePlanner" element={<RacePlanner />} />
        <Route path="help" element={<RaceHelpPage />} />
        <Route path="teams/:teamId/stintPlanner" element={<TeamStintPlannerPage />} />
      </Routes>
    </div>
  );
}

export default RaceEventPage;
