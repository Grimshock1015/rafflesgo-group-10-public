import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { User } from 'firebase/auth';
import { Link } from 'react-router-dom';
import { RafflesGoService, SightingsService } from '../api';

type MySightingsDashboard = Awaited<ReturnType<typeof SightingsService.getMySightingsDashboard>>;
type JoinedSurveyWalk = Awaited<ReturnType<typeof RafflesGoService.listSurveyWalksForCurrentUser>>['surveyWalks'][number];

const sectionStyle: CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
  borderRadius: '16px',
  padding: '1.5rem',
  marginTop: '1.5rem',
};

const cardStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
  borderRadius: '14px',
  padding: '1rem 1.25rem',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '1rem',
  marginTop: '1rem',
};

function formatTimestamp(value?: string) {
  if (!value) return 'No submissions yet';

  return new Intl.DateTimeFormat('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatWalkDate(value: string) {
  return new Intl.DateTimeFormat('en-SG', {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function getWalkStartDateTime(walk: JoinedSurveyWalk) {
  return new Date(`${walk.date.split('T')[0]}T${walk.startTime}:00`);
}
import { getAllDrafts } from '../services/SightingDraftsService';

export default function Dashboard({ user }: { user: User }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [draftCount, setDraftCount] = useState(0);
  const [detailsError, setDetailsError] = useState(false);
  const [sightingsError, setSightingsError] = useState(false);
  const [surveyWalksError, setSurveyWalksError] = useState(false);
  const [sightingsData, setSightingsData] = useState<MySightingsDashboard | null>(null);
  const [joinedSurveyWalks, setJoinedSurveyWalks] = useState<JoinedSurveyWalk[]>([]);
  const [isLoadingSightings, setIsLoadingSightings] = useState(true);
  const [isLoadingSurveyWalks, setIsLoadingSurveyWalks] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      setDetailsError(false);
      setSightingsError(false);
      setSurveyWalksError(false);
      setIsLoadingSightings(true);
      setIsLoadingSurveyWalks(true);

      const [userResult, sightingsResult, surveyWalksResult] = await Promise.allSettled([
        RafflesGoService.getCurrentUser(),
        SightingsService.getMySightingsDashboard(),
        RafflesGoService.listSurveyWalksForCurrentUser(),
      ]);

      if (!isMounted) return;

      if (userResult.status === 'fulfilled') {
        setUserEmail(userResult.value.email || '');
        setUserRole(userResult.value.role || '');
      } else {
        console.error('Failed to fetch user details:', userResult.reason);
        setDetailsError(true);
      }

      if (sightingsResult.status === 'fulfilled') {
        setSightingsData(sightingsResult.value);
      } else {
        console.error('Failed to fetch sightings dashboard:', sightingsResult.reason);
        setSightingsError(true);
      }

      if (surveyWalksResult.status === 'fulfilled') {
        setJoinedSurveyWalks(surveyWalksResult.value.surveyWalks);
      } else {
        console.error('Failed to fetch joined survey walks:', surveyWalksResult.reason);
        setSurveyWalksError(true);
      }

      setIsLoadingSightings(false);
      setIsLoadingSurveyWalks(false);
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  useEffect(() => {
    const loadDraftCount = async () => {
      try {
        const drafts = await getAllDrafts();
        setDraftCount(drafts.filter((draft) => draft.userId === user.uid).length);
      } catch (draftError) {
        console.error('Failed to load draft count:', draftError);
      }
    };

    void loadDraftCount();
  }, [user.uid]);

  const displayRole =
    userRole === 'user'
      ? 'Volunteer'
      : userRole === 'admin'
        ? 'Admin'
        : userRole;

  const stats = sightingsData?.stats;
  const sightings = sightingsData?.sightings ?? [];
  const topSpecies = stats?.speciesBreakdown[0];
  const displayName = user.displayName || userEmail || 'Volunteer';
  const now = new Date();
  const nextUpcomingWalk = joinedSurveyWalks
    .filter((walk) => !walk.isFinished && getWalkStartDateTime(walk) >= now)
    .sort((a, b) => getWalkStartDateTime(a).getTime() - getWalkStartDateTime(b).getTime())[0];

  return (
    <main className="main-content">
      <div className="container" style={{ paddingBottom: '3rem' }}>
        <header className="welcome-header" style = {sectionStyle}>
          <h1>
            <span>Welcome back, </span>
            <span id="volunteerName">{displayName}</span>
          </h1>
          {displayRole ? <p>Role: {displayRole}</p> : null}
          {userEmail ? <p>Email: {userEmail}</p> : null}
          {detailsError ? (
            <p className="text-error">Something went wrong getting your details. Please try again later.</p>
          ) : null}
        </header>

        <section className="quick-actions" style={sectionStyle}>
          <h2>Quick Actions</h2>
          <div className="action-buttons" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link to="/submit-sighting" className="btn btn-primary">
              Submit Sighting
            </Link>
            <a href="#my-sightings" className="btn btn-secondary">
              View My Sightings
            </a>

            <Link to="/drafts" className="btn btn-secondary">
              Saved Drafts {draftCount > 0 ? `(${draftCount})` : ''}
            </Link>
            {userRole === 'admin' ? (
              <Link to="/admin" className="btn btn-secondary">
                Admin Dashboard
              </Link>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="next-walk-heading" style={sectionStyle} className="next-walk-section">
          <h2 id="next-walk-heading">Next Upcoming Walk</h2>

          {isLoadingSurveyWalks ? (
            <p>Loading your next walk...</p>
          ) : surveyWalksError ? (
            <p className="text-error">Could not load your upcoming survey walks right now.</p>
          ) : !nextUpcomingWalk ? (
            <p>You do not have any upcoming survey walks.</p>
          ) : (
            <article style={cardStyle} className="next-walk-card">
              <h3 style={{ marginBottom: '0.5rem' }}>{nextUpcomingWalk.name}</h3>
              <p>{formatWalkDate(nextUpcomingWalk.date)}</p>
              <p>
                {nextUpcomingWalk.startTime} to {nextUpcomingWalk.endTime}
              </p>
              <p>
                Leader: {nextUpcomingWalk.leader.name}
              </p>
              <p>
                Volunteers: {nextUpcomingWalk.volunteers.map((volunteer) => volunteer.name).join(', ')}
              </p>
            </article>
          )}
        </section>

        <section aria-labelledby="activity-overview" style={sectionStyle}>
          <h2 id="activity-overview">My Activity</h2>
          <p>Your recent survey effort and submitted sightings at a glance.</p>

          {sightingsError ? (
            <p className="text-error">Could not load your sightings right now. Please refresh and try again.</p>
          ) : null}

          {isLoadingSightings ? (
            <p>Loading your submission history...</p>
          ) : (
            <div style={gridStyle}>
              <article style={cardStyle}>
                <p>Total submissions</p>
                <strong style={{ fontSize: '2rem' }}>{stats?.totalSubmissions ?? 0}</strong>
              </article>
              <article style={cardStyle}>
                <p>Confirmed sightings</p>
                <strong style={{ fontSize: '2rem' }}>{stats?.sightedCount ?? 0}</strong>
              </article>
              <article style={cardStyle}>
                <p>Zero-sighting walks</p>
                <strong style={{ fontSize: '2rem' }}>{stats?.notSightedCount ?? 0}</strong>
              </article>
              <article style={cardStyle}>
                <p>Routes covered</p>
                <strong style={{ fontSize: '2rem' }}>{stats?.uniqueLocations ?? 0}</strong>
              </article>
              <article style={cardStyle}>
                <p>Adults counted</p>
                <strong style={{ fontSize: '2rem' }}>{stats?.totalAdults ?? 0}</strong>
              </article>
              <article style={cardStyle}>
                <p>Juveniles counted</p>
                <strong style={{ fontSize: '2rem' }}>{stats?.totalJuveniles ?? 0}</strong>
              </article>
            </div>
          )}

          {!isLoadingSightings && !sightingsError ? (
            <div style={{ ...gridStyle, marginTop: '1.5rem' }}>
              <article style={cardStyle}>
                <h3>Most logged species</h3>
                <p>{topSpecies ? `${topSpecies.species} (${topSpecies.count})` : 'No species recorded yet'}</p>
              </article>
              <article style={cardStyle}>
                <h3>Latest submission</h3>
                <p>{formatTimestamp(stats?.latestSubmissionAt)}</p>
              </article>
            </div>
          ) : null}
        </section>

        <section id="my-sightings" aria-labelledby="my-sightings-heading" style={sectionStyle}>
          <h2 id="my-sightings-heading">My Sightings</h2>

          {isLoadingSightings ? (
            <p>Loading your sightings...</p>
          ) : sightingsError ? (
            <p className="text-error">Your submission history is unavailable right now.</p>
          ) : sightings.length === 0 ? (
            <p>You have not submitted any sightings yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>

              {
                // @ts-ignore
                sightings.map((sighting) => (
                  <article
                    key={sighting.id}
                    style={cardStyle}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ marginBottom: '0.35rem' }}>
                          {sighting.result === 'sighted' ? (sighting.species || 'Sighting recorded') : 'Zero-sighting walk'}
                        </h3>
                        <p>{sighting.location}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p>{sighting.date} at {sighting.time}</p>
                        <p>{formatTimestamp(sighting.createdAt)}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                      <span>Result: {sighting.result === 'sighted' ? 'Sighted' : 'Not sighted'}</span>
                      {typeof sighting.adults === 'number' ? <span>Adults: {sighting.adults}</span> : null}
                      {typeof sighting.juveniles === 'number' ? <span>Juveniles: {sighting.juveniles}</span> : null}
                      {sighting.behaviour ? <span>Behaviour: {sighting.behaviour}</span> : null}
                    </div>

                    {sighting.notes ? (
                      <p style={{ marginTop: '0.75rem' }}>
                        <strong>Notes:</strong> {sighting.notes}
                      </p>
                    ) : null}
                  </article>
                ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
