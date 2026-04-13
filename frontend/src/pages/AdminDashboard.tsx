import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { RafflesGoService } from '../api';
import { listAllAdminSightings } from '../lib/adminSightings';
import { exportAdminDataToGoogleSheets } from '../utils/googleSheetsExport';
import { Container } from '@chakra-ui/react';
import { PersonAvatar } from '../components/SurveyWalkGridPeople';

type AdminUser = Awaited<ReturnType<typeof RafflesGoService.listUsers>>['users'][number];
type AdminSighting = Awaited<ReturnType<typeof listAllAdminSightings>>['sightings'][number];
type AdminSurveyWalk = Awaited<ReturnType<typeof RafflesGoService.listSurveyWalks>>['surveyWalks'][number];

const sectionStyle: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '1.5rem',
  marginTop: '1.5rem',
};

const cardStyle: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '14px',
  padding: '1rem 1.25rem',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem',
  marginTop: '1rem',
};

function formatDate(value?: string) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function AdminDashboard() {
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sightings, setSightings] = useState<AdminSighting[]>([]);
  const [surveyWalks, setSurveyWalks] = useState<AdminSurveyWalk[]>([]);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadAdminData = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const [usersResponse, surveyWalksResponse, sightingsResponse] = await Promise.all([
        RafflesGoService.listUsers(),
        RafflesGoService.listSurveyWalks(),
        listAllAdminSightings(),
      ]);

      setUsers(usersResponse.users);
      setSurveyWalks(surveyWalksResponse.surveyWalks);
      setSightings(sightingsResponse.sightings);
    } catch (loadError) {
      console.error('Failed to load admin data:', loadError);
      setError('Unable to load admin data right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      try {
        const me = await RafflesGoService.getCurrentUser();
        if (!isMounted) return;

        if (me.role !== 'admin') {
          setIsAdmin(false);
          setIsCheckingAccess(false);
          return;
        }

        setIsAdmin(true);
        setIsCheckingAccess(false);
        await loadAdminData();
      } catch (accessError) {
        console.error('Failed to verify admin access:', accessError);
        if (!isMounted) return;
        setIsAdmin(false);
        setIsCheckingAccess(false);
      }
    };

    void checkAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRoleChange = async (email: string | undefined, role: 'user' | 'admin') => {
    if (!email) return;

    try {
      setBusyUserId(email);
      await RafflesGoService.changeUserRole({ email, role });
      await loadAdminData();
    } catch (updateError) {
      console.error('Failed to update role:', updateError);
      setError('Unable to update user role.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleStatusToggle = async (uid: string, disabled: boolean) => {
    try {
      setBusyUserId(uid);
      await RafflesGoService.updateUserStatus(uid, { disabled });
      await loadAdminData();
    } catch (updateError) {
      console.error('Failed to update user status:', updateError);
      setError('Unable to update user status.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleExportGoogleSheets = async () => {
    try {
      setError(null);
      setIsExporting(true);

      const [usersResponse, surveyPeriodsResponse, surveyWalksResponse, sightingsResponse] = await Promise.all([
        RafflesGoService.listUsers(),
        RafflesGoService.listSurveyPeriods(),
        RafflesGoService.listSurveyWalks(),
        listAllAdminSightings(),
      ]);

      exportAdminDataToGoogleSheets({
        users: usersResponse.users,
        surveyPeriods: surveyPeriodsResponse.surveyPeriods,
        surveyWalks: surveyWalksResponse.surveyWalks,
        sightings: sightingsResponse.sightings,
      });
    } catch (exportError) {
      console.error('Failed to export admin data:', exportError);
      setError('Unable to export admin data right now.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isCheckingAccess) {
    return <main className="main-content"><div className="container"><p>Checking admin access...</p></div></main>;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const disabledCount = users.filter((user) => user.disabled).length;
  const sightedCount = sightings.filter((sighting) => sighting.result === 'sighted').length;
  const completedWalks = surveyWalks.filter((walk) => walk.isFinished);
  const noShowCount = completedWalks.reduce((count, walk) => count + walk.noShows.length, 0);

  return (
    <main className="main-content">
      <div className="container" style={{ paddingBottom: '3rem' }}>
        <Container className="welcome-header" mt={5}>
          <h1>Admin Dashboard</h1>
          <p>Manage volunteers, control account access, and review platform activity.</p>
        </Container>

        <section style={sectionStyle}>
          <h2>Admin Overview</h2>
          <div style={gridStyle}>
            <article style={cardStyle}>
              <p>Total users</p>
              <strong style={{ fontSize: '2rem' }}>{users.length}</strong>
            </article>
            <article style={cardStyle}>
              <p>Disabled accounts</p>
              <strong style={{ fontSize: '2rem' }}>{disabledCount}</strong>
            </article>
            <article style={cardStyle}>
              <p>Total sightings</p>
              <strong style={{ fontSize: '2rem' }}>{sightings.length}</strong>
            </article>
            <article style={cardStyle}>
              <p>Confirmed sightings</p>
              <strong style={{ fontSize: '2rem' }}>{sightedCount}</strong>
            </article>
            <article style={cardStyle}>
              <p>Completed walks</p>
              <strong style={{ fontSize: '2rem' }}>{completedWalks.length}</strong>
            </article>
            <article style={cardStyle}>
              <p>Total no-shows</p>
              <strong style={{ fontSize: '2rem' }}>{noShowCount}</strong>
            </article>
          </div>

          <div className="action-buttons" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link to="/survey-periods" className="btn btn-secondary">Manage Survey Periods</Link>
            <Link to="/survey-walks" className="btn btn-secondary">Manage Survey Walks</Link>
            <button className="btn btn-secondary" type="button" onClick={handleExportGoogleSheets} disabled={isLoading || isExporting}>
              {isExporting ? 'Exporting…' : 'Export to Google Sheets'}
            </button>
            <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2>Attendance Tracking</h2>
          <p>Completed survey walks keep the attendance list so repeated no-shows are visible to admins.</p>
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            {completedWalks.length === 0 ? (
              <p>No completed survey walks yet.</p>
            ) : (
              completedWalks
                .slice()
                .sort((a, b) => new Date(b.completedAt ?? b.date).getTime() - new Date(a.completedAt ?? a.date).getTime())
                .map((walk) => (
                  <article key={walk.uid} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ marginBottom: '0.35rem' }}>{walk.name}</h3>
                        <p style={{ margin: 0 }}>Leader: {walk.leader.name || 'Unassigned'}</p>
                        <p style={{ margin: 0 }}>Completed: {formatDate(walk.completedAt ?? walk.date)}</p>
                      </div>
                      <div style={{ minWidth: '220px' }}>
                        <p style={{ margin: 0 }}>Attended: {walk.attendees.map((user) => user.name || user.uid).join(', ') || 'None recorded'}</p>
                        <p style={{ margin: 0 }}>No-show: {walk.noShows.map((user) => user.name || user.uid).join(', ') || 'None'}</p>
                      </div>
                    </div>
                  </article>
                ))
            )}
          </div>
        </section>

        <section style={sectionStyle}>
          <h2>User Management</h2>
          <p>Change roles and disable or re-enable accounts without leaving the dashboard.</p>
          {error ? <p className="text-error">{error}</p> : null}
          {isLoading ? (
            <p>Loading users...</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
              {users.map((managedUser) => {
                const isBusy = busyUserId === managedUser.uid || busyUserId === managedUser.email;

                return (
                  <article key={managedUser.uid} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <PersonAvatar
                          person={{
                            uid: managedUser.uid,
                            name: managedUser.displayName || managedUser.email || managedUser.uid,
                            photoURL: managedUser.photoURL,
                          }}
                          size="56px"
                        />
                        <div>
                          <h3 style={{ marginBottom: '0.35rem' }}>{managedUser.displayName || managedUser.email || managedUser.uid}</h3>
                          <p>{managedUser.email || managedUser.uid}</p>
                          <p>Created: {formatDate(managedUser.createdAt)}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p>Role: {managedUser.role}</p>
                        <p>Status: {managedUser.disabled ? 'Disabled' : 'Active'}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => handleRoleChange(managedUser.email, managedUser.role === 'admin' ? 'user' : 'admin')}
                        disabled={isBusy || !managedUser.email}
                      >
                        {managedUser.role === 'admin' ? 'Make Volunteer' : 'Make Admin'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => handleStatusToggle(managedUser.uid, !managedUser.disabled)}
                        disabled={isBusy}
                      >
                        {managedUser.disabled ? 'Enable Account' : 'Disable Account'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
