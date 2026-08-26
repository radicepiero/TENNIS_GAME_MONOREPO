import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AppShell from './layout/AppShell'
import HomePage from './pages/HomePage'
import PresencesPage from './pages/PresencesPage'
import ExperiencesPage from './pages/ExperiencesPage'
import BoatPage from './pages/BoatPage'
import GardenPage from './pages/GardenPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="presences" element={<PresencesPage />} />
        <Route path="experiences" element={<ExperiencesPage />} />
        <Route path="boat" element={<BoatPage />} />
        <Route path="garden" element={<GardenPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
