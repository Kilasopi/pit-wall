import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import DriversPage from './pages/DriversPage.jsx'
import StintPlannerPage from './pages/StintPlannerPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/planner" element={<StintPlannerPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
