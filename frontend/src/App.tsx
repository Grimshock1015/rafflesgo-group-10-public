import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from './lib/firebase'
import { Routes, Route, Navigate, useLocation, useOutlet } from 'react-router-dom'

import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import DraftsPage from './pages/draftPage'

import type { ReactNode } from 'react'
import SubmitSightingPage from './pages/SubmitSighting'
import SurveyPeriodList from './pages/SurveyPeriodList'
import CreateSurveyPeriod from './pages/CreateSurveyPeriod'
import EditSurveyPeriod from './pages/EditSurveyPeriod'
import { Navigation } from './components/Navigation'
import SurveyWalkList from './pages/SurveyWalkList'
import CreateSurveyWalk from './pages/CreateSurveyWalk'
import EditSurveyWalk from './pages/EditSurveyWalk'
import { RafflesGoService } from './api'
import AdminDashboard from './pages/AdminDashboard'

function RequireAuth({ user, children }: { user: User | null; children: ReactNode }) {
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let isMounted = true

    const checkAdmin = async () => {
      try {
        const currentUser = await RafflesGoService.getCurrentUser()
        if (isMounted) {
          setIsAdmin(currentUser.role === 'admin')
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkAdmin()

    return () => {
      isMounted = false
    }
  }, [])

  if (isLoading) {
    return <div style={{ padding: 24 }}>Checking access...</div>
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />
  }

  return children
}

function ProtectedLayout({ user }: { user: User | null }) {
  const location = useLocation()
  const outlet = useOutlet()
  const [displayedOutlet, setDisplayedOutlet] = useState(outlet)
  const [displayedPath, setDisplayedPath] = useState(location.pathname)
  const isTransitioning = location.pathname !== displayedPath

  return (
    <RequireAuth user={user}>
      <Navigation user={user!} />
      <div
        onTransitionEnd={(event) => {
          if (event.target !== event.currentTarget || !isTransitioning) return
          setDisplayedOutlet(outlet)
          setDisplayedPath(location.pathname)
        }}
        style={{
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 140ms ease',
        }}
      >
        {displayedOutlet}
      </div>
    </RequireAuth>
  )
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
      <Route element={<ProtectedLayout user={user} />}>
        <Route path="/dashboard" element={<Dashboard user={user!} />} />
        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/submit-sighting" element={<SubmitSightingPage user={user!} />} />
        <Route path="/survey-periods" element={<RequireAdmin><SurveyPeriodList user={user!} /></RequireAdmin>} />
        <Route path="/create-survey-period" element={<RequireAdmin><CreateSurveyPeriod /></RequireAdmin>} />
        <Route path="/create-survey-walk" element={<RequireAdmin><CreateSurveyWalk /></RequireAdmin>} />
        <Route path="/drafts" element={<DraftsPage user={user!} />} />
        <Route path="/edit-survey-period/:surveyPeriodId" element={<RequireAdmin><EditSurveyPeriod /></RequireAdmin>} />
        <Route path="/edit-survey-walk/:surveyWalkId" element={<RequireAdmin><EditSurveyWalk /></RequireAdmin>} />
        <Route path="/survey-walks" element={<SurveyWalkList user={user!} />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
