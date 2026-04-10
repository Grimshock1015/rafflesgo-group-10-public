import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { User } from 'firebase/auth';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { RafflesGoService, SightingsService } from '../api';
import { getAllDrafts } from '../services/SightingDraftsService';
import InvitationNotifications from '../components/InvitationNotifications';

type MySightingsDashboard = Awaited<ReturnType<typeof SightingsService.getMySightingsDashboard>>;
type JoinedSurveyWalk = Awaited<ReturnType<typeof RafflesGoService.listSurveyWalksForCurrentUser>>['surveyWalks'][number];
type ActivePeriod = Awaited<ReturnType<typeof RafflesGoService.getActiveSurveyPeriod>>;
type WeatherAssessment = {
  precipitationProbability: number;
  weatherCode: number;
  summary: string;
};
type WeatherApiHourly = {
  time: string[];
  precipitation_probability: number[];
  weather_code: number[];
};

const SINGAPORE_COORDINATES = { latitude: 1.3521, longitude: 103.8198 };

const GREEN = '#4caf72';
const ORANGE = '#f0a500';
const BLUE = '#5b9cf6';
const GRAY = 'rgba(255,255,255,0.12)';

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

const weatherWarningStyle: CSSProperties = {
  marginTop: '1rem',
  padding: '0.75rem 1rem',
  borderRadius: '12px',
  border: '1px solid rgba(255, 184, 77, 0.45)',
  background: 'rgba(255, 184, 77, 0.12)',
  color: '#ffe2b3',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '1rem',
  marginTop: '1rem',
};

const chartRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '1.5rem',
  marginTop: '1.5rem',
};

const chartCardStyle: CSSProperties = {
  ...cardStyle,
  padding: '1.5rem 1rem',
  textAlign: 'center',
};

function formatTimestamp(value?: string) {
  if (!value) return 'No submissions yet';
  return new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatWalkDate(value: string) {
  return new Intl.DateTimeFormat('en-SG', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(value));
}

function getWalkStartDateTime(walk: JoinedSurveyWalk) {
  return new Date(`${walk.date.split('T')[0]}T${walk.startTime}:00`);
}

function getWeatherSummary(weatherCode: number) {
  if ([95, 96, 99].includes(weatherCode)) return 'thunderstorms';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return 'rain';
  return 'unsettled weather';
}

function isBadWeather(weatherCode: number, precipitationProbability: number) {
  return precipitationProbability >= 60 || [95, 96, 99, 63, 65, 81, 82].includes(weatherCode);
}

function getForecastLookupKey(walk: JoinedSurveyWalk) {
  const [hour, minute] = walk.startTime.split(':').map(Number);
  const roundedHour = minute >= 30 ? Math.min(hour + 1, 23) : hour;
  return `${walk.date.split('T')[0]}T${String(roundedHour).padStart(2, '0')}:00`;
}

function getWalkForecastMatch(walk: JoinedSurveyWalk, hourly: WeatherApiHourly) {
  const targetKey = getForecastLookupKey(walk);
  const exactIndex = hourly.time.findIndex((time) => time === targetKey);
  const fallbackIndex = hourly.time.findIndex((time) => time.startsWith(walk.date.split('T')[0]));
  const forecastIndex = exactIndex >= 0 ? exactIndex : fallbackIndex;
  if (forecastIndex < 0) return null;
  const precipitationProbability = hourly.precipitation_probability[forecastIndex];
  const weatherCode = hourly.weather_code[forecastIndex];
  if (typeof precipitationProbability !== 'number' || typeof weatherCode !== 'number') return null;
  return { precipitationProbability, weatherCode, summary: getWeatherSummary(weatherCode) } satisfies WeatherAssessment;
}

// Custom center label for donut charts
function DonutLabel({ cx, cy, pct, label }: { cx: number; cy: number; pct: number; label: string }) {
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="currentColor" fontSize={26} fontWeight={700}>{pct}%</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11}>{label}</text>
    </g>
  );
}

export default function Dashboard({ user }: { user: User }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [draftCount, setDraftCount] = useState(0);
  const [detailsError, setDetailsError] = useState(false);
  const [sightingsError, setSightingsError] = useState(false);
  const [surveyWalksError, setSurveyWalksError] = useState(false);
  const [sightingsData, setSightingsData] = useState<MySightingsDashboard | null>(null);
  const [joinedSurveyWalks, setJoinedSurveyWalks] = useState<JoinedSurveyWalk[]>([]);
  const [activePeriod, setActivePeriod] = useState<ActivePeriod>(null);
  const [isLoadingSightings, setIsLoadingSightings] = useState(true);
  const [isLoadingSurveyWalks, setIsLoadingSurveyWalks] = useState(true);
  const [weatherAssessment, setWeatherAssessment] = useState<WeatherAssessment | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      setDetailsError(false);
      setSightingsError(false);
      setSurveyWalksError(false);
      setIsLoadingSightings(true);
      setIsLoadingSurveyWalks(true);

      const [userResult, sightingsResult, surveyWalksResult, periodResult] = await Promise.allSettled([
        RafflesGoService.getCurrentUser(),
        SightingsService.getMySightingsDashboard(),
        RafflesGoService.listSurveyWalksForCurrentUser(),
        RafflesGoService.getActiveSurveyPeriod(),
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

      if (periodResult.status === 'fulfilled') {
        setActivePeriod(periodResult.value);
      } else {
        console.error('Failed to fetch active period:', periodResult.reason);
      }

      setIsLoadingSightings(false);
      setIsLoadingSurveyWalks(false);
    };

    fetchDashboardData();
    return () => { isMounted = false; };
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

  const displayRole = userRole === 'user' ? 'Volunteer' : userRole === 'admin' ? 'Admin' : userRole;
  const stats = sightingsData?.stats;
  const sightings = sightingsData?.sightings ?? [];
  const displayName = user.displayName || userEmail || 'Volunteer';
  const now = new Date();

  const nextUpcomingWalk = joinedSurveyWalks
    .filter((walk) => !walk.isFinished && getWalkStartDateTime(walk) >= now)
    .sort((a, b) => getWalkStartDateTime(a).getTime() - getWalkStartDateTime(b).getTime())[0];

  // Computed chart data
  const chartData = useMemo(() => {
    const finishedWalks = joinedSurveyWalks.filter((w) => w.isFinished);
    const attended = finishedWalks.filter((w) => w.attendeeUids.includes(user.uid)).length;
    const missed = finishedWalks.length - attended;
    const attendancePct = finishedWalks.length === 0 ? 0 : Math.round((attended / finishedWalks.length) * 100);

    const currentPeriodFinished = activePeriod
      ? joinedSurveyWalks.filter((w) => w.surveyPeriodUid === activePeriod.uid && w.isFinished)
      : [];
    const currentPeriodAttended = currentPeriodFinished.filter((w) => w.attendeeUids.includes(user.uid)).length;
    const minWalks = activePeriod?.minWalks ?? 0;
    const periodPct = minWalks === 0 ? 0 : Math.min(100, Math.round((currentPeriodAttended / minWalks) * 100));

    const totalSubmissions = stats?.totalSubmissions ?? 0;
    const sightedCount = stats?.sightedCount ?? 0;
    const sightingPct = totalSubmissions === 0 ? 0 : Math.round((sightedCount / totalSubmissions) * 100);

    const speciesBreakdown = stats?.speciesBreakdown ?? [];
    const uniquePeriods = new Set(joinedSurveyWalks.map((w) => w.surveyPeriodUid)).size;

    return {
      attended, missed, finishedWalks: finishedWalks.length, attendancePct,
      currentPeriodAttended, minWalks, periodPct,
      sightedCount, notSightedCount: totalSubmissions - sightedCount, totalSubmissions, sightingPct,
      speciesBreakdown, uniquePeriods,
    };
  }, [joinedSurveyWalks, activePeriod, stats, user.uid]);

  useEffect(() => {
    if (!nextUpcomingWalk) {
      setWeatherAssessment(null);
      setWeatherError(false);
      setIsLoadingWeather(false);
      return;
    }

    const walkDate = getWalkStartDateTime(nextUpcomingWalk);
    const forecastWindowEnd = new Date();
    forecastWindowEnd.setDate(forecastWindowEnd.getDate() + 7);

    if (walkDate > forecastWindowEnd) {
      setWeatherAssessment(null);
      setWeatherError(false);
      setIsLoadingWeather(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchWeather = async () => {
      setIsLoadingWeather(true);
      setWeatherError(false);
      try {
        const params = new URLSearchParams({
          latitude: String(SINGAPORE_COORDINATES.latitude),
          longitude: String(SINGAPORE_COORDINATES.longitude),
          hourly: 'precipitation_probability,weather_code',
          timezone: 'Asia/Singapore',
          forecast_days: '7',
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Weather request failed with ${response.status}`);
        const weatherData = await response.json();
        const hourlyData = weatherData?.hourly;
        const hasValidHourlyData =
          Array.isArray(hourlyData?.time) &&
          Array.isArray(hourlyData?.precipitation_probability) &&
          Array.isArray(hourlyData?.weather_code);
        if (!hasValidHourlyData) throw new Error('Weather response did not include hourly forecast data');
        const match = getWalkForecastMatch(nextUpcomingWalk, hourlyData);
        if (!isMounted) return;
        setWeatherAssessment(match && isBadWeather(match.weatherCode, match.precipitationProbability) ? match : null);
      } catch (error) {
        if (controller.signal.aborted || !isMounted) return;
        console.error('Failed to fetch weather forecast:', error);
        setWeatherAssessment(null);
        setWeatherError(true);
      } finally {
        if (isMounted) setIsLoadingWeather(false);
      }
    };

    void fetchWeather();
    return () => { isMounted = false; controller.abort(); };
  }, [nextUpcomingWalk]);

  return (
    <main className="main-content">
      <div className="container" style={{ paddingBottom: '3rem' }}>

        {/* Welcome */}
        <header className="welcome-header" style={sectionStyle}>
          <h1><span>Welcome back, </span><span id="volunteerName">{displayName}</span></h1>
          {displayRole ? <p>Role: {displayRole}</p> : null}
          {userEmail ? <p>Email: {userEmail}</p> : null}
          {detailsError ? <p className="text-error">Something went wrong getting your details. Please try again later.</p> : null}
        </header>

        {/* Quick Actions */}
        <section className="quick-actions" style={sectionStyle}>
          <h2>Quick Actions</h2>
          <div className="action-buttons" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link to="/submit-sighting" className="btn btn-primary">Submit Sighting</Link>
            <a href="#my-sightings" className="btn btn-secondary">View My Sightings</a>
            <Link to="/drafts" className="btn btn-secondary">Saved Drafts {draftCount > 0 ? `(${draftCount})` : ''}</Link>
            {userRole === 'admin' ? <Link to="/admin" className="btn btn-secondary">Admin Dashboard</Link> : null}
          </div>
        </section>

        <InvitationNotifications userEmail={userEmail} />

        {/* Next Upcoming Walk */}
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
              <p>{nextUpcomingWalk.startTime} to {nextUpcomingWalk.endTime}</p>
              <p>Leader: {nextUpcomingWalk.leader.name}</p>
              <p>Volunteers: {nextUpcomingWalk.volunteers.map((v) => v.name).join(', ')}</p>
              {isLoadingWeather ? <p style={{ marginTop: '1rem' }}>Checking Singapore weather for this walk...</p> : null}
              {weatherAssessment ? (
                <div role="alert" aria-live="polite" style={weatherWarningStyle}>
                  Forecast warning: {weatherAssessment.summary} expected near the walk start, with about{' '}
                  {weatherAssessment.precipitationProbability}% chance of rain in Singapore. Bring rain gear and plan for wet conditions.
                </div>
              ) : null}
              {weatherError ? <p style={{ marginTop: '1rem' }} className="text-error">Weather forecast is unavailable right now.</p> : null}
            </article>
          )}
        </section>

        {/* My Progress — charts */}
        <section aria-labelledby="progress-heading" style={sectionStyle}>
          <h2 id="progress-heading">My Progress</h2>
          <p style={{ opacity: 0.6, fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {chartData.uniquePeriods} survey period{chartData.uniquePeriods !== 1 ? 's' : ''} joined &nbsp;·&nbsp; {joinedSurveyWalks.length} walk{joinedSurveyWalks.length !== 1 ? 's' : ''} joined
          </p>

          {isLoadingSurveyWalks || isLoadingSightings ? (
            <p style={{ marginTop: '1rem' }}>Loading your progress...</p>
          ) : (
            <div style={chartRowStyle}>

              {/* Chart 1: Current period progress — radial/semicircle */}
              <article style={chartCardStyle}>
                <h3 style={{ marginBottom: '0.25rem' }}>Current Period</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.55, marginBottom: '0.5rem' }}>
                  {activePeriod ? activePeriod.name : 'No active period'}
                </p>
                {activePeriod ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <RadialBarChart
                        cx="50%" cy="100%"
                        innerRadius="70%" outerRadius="110%"
                        startAngle={180} endAngle={0}
                        data={[{ value: chartData.periodPct, fill: chartData.periodPct >= 100 ? GREEN : ORANGE }]}
                      >
                        <RadialBar dataKey="value" cornerRadius={6} background={{ fill: GRAY }} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <p style={{ fontSize: '2.2rem', fontWeight: 700, marginTop: '-0.5rem' }}>{chartData.periodPct}%</p>
                    <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '0.2rem' }}>
                      {chartData.currentPeriodAttended} / {chartData.minWalks} walks attended
                    </p>
                    {chartData.periodPct >= 100
                      ? <p style={{ color: GREEN, fontSize: '0.85rem', marginTop: '0.5rem' }}>Minimum requirement met!</p>
                      : <p style={{ opacity: 0.55, fontSize: '0.85rem', marginTop: '0.5rem' }}>
                          {chartData.minWalks - chartData.currentPeriodAttended} more walk{chartData.minWalks - chartData.currentPeriodAttended !== 1 ? 's' : ''} needed
                        </p>
                    }
                  </>
                ) : (
                  <p style={{ opacity: 0.45, marginTop: '2rem' }}>No active survey period</p>
                )}
              </article>

              {/* Chart 2: Walk attendance — donut */}
              <article style={chartCardStyle}>
                <h3 style={{ marginBottom: '0.25rem' }}>Walk Attendance</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.55, marginBottom: '0.5rem' }}>Across all completed walks</p>
                {chartData.finishedWalks > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Attended', value: chartData.attended },
                            { name: 'Missed', value: chartData.missed },
                          ]}
                          cx="50%" cy="50%"
                          innerRadius="55%" outerRadius="80%"
                          startAngle={90} endAngle={-270}
                          dataKey="value"
                          labelLine={false}
                          label={(props) =>
                            props.name === 'Attended'
                              ? <DonutLabel cx={props.cx} cy={props.cy} pct={chartData.attendancePct} label="attendance" />
                              : null
                          }
                        >
                          <Cell fill={GREEN} />
                          <Cell fill={GRAY} />
                        </Pie>
                        <Tooltip formatter={(val: unknown) => [`${val} walks`, '']} contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{chartData.attended} attended / {chartData.finishedWalks} completed walks</p>
                  </>
                ) : (
                  <p style={{ opacity: 0.45, marginTop: '3.5rem' }}>No completed walks yet</p>
                )}
              </article>

              {/* Chart 3: Langur encounter rate — donut */}
              <article style={chartCardStyle}>
                <h3 style={{ marginBottom: '0.25rem' }}>Langur Encounter Rate</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.55, marginBottom: '0.5rem' }}>Sightings vs submissions</p>
                {chartData.totalSubmissions > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Sighted', value: chartData.sightedCount },
                            { name: 'Not sighted', value: chartData.notSightedCount },
                          ]}
                          cx="50%" cy="50%"
                          innerRadius="55%" outerRadius="80%"
                          startAngle={90} endAngle={-270}
                          dataKey="value"
                          labelLine={false}
                          label={(props) =>
                            props.name === 'Sighted'
                              ? <DonutLabel cx={props.cx} cy={props.cy} pct={chartData.sightingPct} label="encounter rate" />
                              : null
                          }
                        >
                          <Cell fill={BLUE} />
                          <Cell fill={GRAY} />
                        </Pie>
                        <Tooltip formatter={(val: unknown) => [`${val} submissions`, '']} contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{chartData.sightedCount} sighted / {chartData.totalSubmissions} total submissions</p>
                  </>
                ) : (
                  <p style={{ opacity: 0.45, marginTop: '3.5rem' }}>No submissions yet</p>
                )}
              </article>

            </div>
          )}

          {/* Species bar chart */}
          {!isLoadingSightings && chartData.speciesBreakdown.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Species Encountered</h3>
              <p style={{ opacity: 0.55, fontSize: '0.85rem', marginBottom: '0.5rem' }}>{chartData.speciesBreakdown.length} species recorded</p>
              <ResponsiveContainer width="100%" height={Math.max(160, chartData.speciesBreakdown.length * 46)}>
                <BarChart
                  data={chartData.speciesBreakdown.map((s) => ({ name: s.species, count: s.count }))}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 13 }} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={(val: unknown) => [`${val} time${val !== 1 ? 's' : ''}`, 'Recorded']} />
                  <Bar dataKey="count" fill={GREEN} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* My Activity — simplified, no duplicates with charts above */}
        <section aria-labelledby="activity-overview" style={sectionStyle}>
          <h2 id="activity-overview">My Activity</h2>
          <p style={{ opacity: 0.6, fontSize: '0.9rem', marginTop: '0.25rem' }}>Additional sighting details</p>

          {sightingsError ? (
            <p className="text-error" style={{ marginTop: '1rem' }}>Could not load your sightings right now. Please refresh and try again.</p>
          ) : isLoadingSightings ? (
            <p style={{ marginTop: '1rem' }}>Loading...</p>
          ) : (
            <>
              <div style={gridStyle}>
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
              <div style={{ ...gridStyle, marginTop: '1.5rem' }}>
                <article style={cardStyle}>
                  <h3>Most logged species</h3>
                  <p>{stats?.speciesBreakdown[0] ? `${stats.speciesBreakdown[0].species} (${stats.speciesBreakdown[0].count})` : 'No species recorded yet'}</p>
                </article>
                <article style={cardStyle}>
                  <h3>Latest submission</h3>
                  <p>{formatTimestamp(stats?.latestSubmissionAt)}</p>
                </article>
              </div>
            </>
          )}
        </section>

        {/* My Sightings list */}
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
                  <article key={sighting.id} style={cardStyle}>
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
                    {sighting.notes ? <p style={{ marginTop: '0.75rem' }}><strong>Notes:</strong> {sighting.notes}</p> : null}
                  </article>
                ))
              }
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
