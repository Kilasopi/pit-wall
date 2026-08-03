import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RaceView from './pages/RaceView.jsx'
import TeamSelectPage from './pages/TeamSelectPage.jsx'
import DriversPage from './pages/DriversPage.jsx'
import StintPlannerPage from './pages/StintPlannerPage.jsx'
import ThemePreview from './pages/ThemePreview.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TeamSelectPage />} />
        <Route path="/t/:teamId/*" element={<RaceView />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/planner" element={<StintPlannerPage />} />
        {import.meta.env.DEV && (
          <Route path="/theme-preview" element={<ThemePreview />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App
