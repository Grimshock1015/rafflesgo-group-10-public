import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from './lib/firebase'
// import styles from './App.module.css'
// import { RafflesGoService } from './api'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'

import type { ReactNode } from 'react'
import SurveyPeriodList from './pages/SurveyPeriodList'
import CreateSurveyPeriod from './pages/CreateSurveyPeriod'

function RequireAuth({ user, children }: { user: User | null; children: ReactNode }) {
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>

  return (
    <Routes>
      {/* default */}
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />

      {/* public */}
      <Route path="/login" element={<LoginPage user={user} />} />

      {/* protected */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth user={user}>
            <Dashboard user={user!} />
          </RequireAuth>
        }
      />

      <Route
        path="/survey-periods"
        element={
          <RequireAuth user={user}>
            <SurveyPeriodList user={user!} />
          </RequireAuth>
        }
      />

      <Route
        path="/create-survey-period"
        element={
          <RequireAuth user={user}>
            <CreateSurveyPeriod user={user!} />
          </RequireAuth>
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}