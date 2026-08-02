import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PitWall from './pages/PitWall.jsx'
import DriversPage from './pages/DriversPage.jsx'
import StintPlannerPage from './pages/StintPlannerPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PitWall />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/planner" element={<StintPlannerPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
