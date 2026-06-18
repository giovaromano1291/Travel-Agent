import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import PlannerPage from './pages/PlannerPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={loadingStyle}>✈️ Caricamento...</div>
  return user ? children : <Navigate to="/auth" replace />
}

const loadingStyle = {
  background: '#0d0d0d', color: '#C9A84C', minHeight: '100vh',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, fontFamily: 'sans-serif'
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/planner" element={<PrivateRoute><PlannerPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
