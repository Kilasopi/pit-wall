import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RaceView from './pages/RaceView.jsx'
import TeamSelectPage from './pages/TeamSelectPage.jsx'
import SpectateRoot from './pages/SpectateRoot.jsx'
import DriversPage from './pages/DriversPage.jsx'
import RacesPage from './pages/RacesPage.jsx'
import RaceEventPage from './pages/Races-Pages/RaceEventPage.jsx'
import ThemePreview from './pages/ThemePreview.jsx'
import { isSpectateHost } from './lib/host.js'
import Schedule from './pages/Schedule.jsx';


function App() {
  // Crew-only pages (roster management, stint planning) have no reason
  // to exist on the family-facing spectate.murder-pitwall.com hostname —
  // see RaceView.jsx for the equivalent split on the /t/:teamId/* pages.
  const spectateHost = isSpectateHost()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={spectateHost ? <SpectateRoot /> : <TeamSelectPage />} />
        <Route path="/t/:teamId/*" element={<RaceView />} />
        {spectateHost ? (
          <>
            <Route path="/drivers" element={<Navigate to="/" replace />} />
            <Route path="/races" element={<Navigate to="/" replace />} />
            <Route path="/races/:raceEventId/*" element={<Navigate to="/" replace />} />
            <Route path="/schedule" element={<Navigate to="/" replace />} />

          </>
        ) : (
          <>
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/races" element={<RacesPage />} />
            <Route path="/races/:raceEventId/*" element={<RaceEventPage />} />
            <Route path="/schedule" element={<Schedule />} />
          </>
        )}
        {import.meta.env.DEV && (
          <Route path="/theme-preview" element={<ThemePreview />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App
