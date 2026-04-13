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
import { userTutorialSteps, adminTutorialSteps } from './constants/tutorialSteps'
import TutorialModal from './components/TutorialModal'

function AppBootLoader({ message }: { message: string }) {
  return (
    <main
      className="main-content"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-primary, #f6f8f5)',
      }}
    >
      <section
        className="fade-in"
        style={{
          width: 'min(520px, calc(100vw - 2rem))',
          border: '1px solid var(--border-color, rgba(0, 0, 0, 0.1))',
          borderRadius: 16,
          background: 'var(--bg-card, #ffffff)',
          padding: '1.5rem',
        }}
      >
        <div className="loading-spinner" aria-hidden="true" />
        <p style={{ textAlign: 'center', marginTop: '0.85rem' }}>{message}</p>
        <div style={{ marginTop: '1.1rem', display: 'grid', gap: '0.55rem' }}>
          <div style={{ height: 10, borderRadius: 999, background: 'var(--bg-secondary, #eef3eb)' }} />
          <div style={{ height: 10, width: '82%', borderRadius: 999, background: 'var(--bg-secondary, #eef3eb)' }} />
          <div style={{ height: 10, width: '70%', borderRadius: 999, background: 'var(--bg-secondary, #eef3eb)' }} />
        </div>
      </section>
    </main>
  )
}

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
    return <AppBootLoader message="Checking your access..." />
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
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user')
  const [roleChecked, setRoleChecked] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    if (!user || !roleChecked) {
      return
    }

    const tutorialKey = `hasSeenTutorial_${userRole}_${user.uid}`
    const hasSeenTutorial = localStorage.getItem(tutorialKey)

    if (!hasSeenTutorial) {
      setShowTutorial(true)
    }
  }, [user, userRole, roleChecked])

  useEffect(() => {
    let isMounted = true

    const fetchUserRole = async () => {
      if (!user) {
        if (isMounted) setRoleChecked(true)
        return
      }

      try {
        const currentUser = await RafflesGoService.getCurrentUser()
        if (isMounted) {
          setUserRole(currentUser.role === 'admin' ? 'admin' : 'user')
        }
      } catch {
        if (isMounted) {
          setUserRole('user')
        }
      } finally {
        if (isMounted) {
          setRoleChecked(true)
        }
      }
    }

    fetchUserRole()

    return () => {
      isMounted = false
    }
  }, [user])

  const tutorialKey =
    user && roleChecked
      ? `hasSeenTutorial_${userRole}_${user.uid}`
      : null

  const selectedTutorialSteps =
    userRole === 'admin' ? adminTutorialSteps : userTutorialSteps

  const handleTutorialFinish = () => {
    if (!tutorialKey) return

    localStorage.setItem(tutorialKey, 'true')
    setShowTutorial(false)
  }

  return (
    <RequireAuth user={user}>
      <Navigation user={user!} onOpenTutorial={() => setShowTutorial(true)} />
      {showTutorial && roleChecked && (
        <TutorialModal
          steps={selectedTutorialSteps}
          onFinish={handleTutorialFinish}
        />
      )}
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

export { ProtectedLayout }

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

  if (loading) return <AppBootLoader message="Loading your workspace..." />

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
