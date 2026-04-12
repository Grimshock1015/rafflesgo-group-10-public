/**
 * ⚠️  DISCLAIMER: This is a reference test file for students.
 *     These tests may break as you modify the Dashboard component.
 *     Update or remove tests as needed when making changes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from './test-utils';
import Dashboard from '../pages/Dashboard';
import type { User } from 'firebase/auth';

// Mock the API service
vi.mock('../api', () => ({
  RafflesGoService: {
    sayHello: vi.fn(),
    getCurrentUser: vi.fn(),
    listSurveyWalksForCurrentUser: vi.fn(),
    getActiveSurveyPeriod: vi.fn().mockResolvedValue(null),
  },
  SightingsService: {
    getMySightingsDashboard: vi.fn(),
  },
}));

vi.mock('../services/SightingDraftsService', () => ({
  getAllDrafts: vi.fn(),
}));

import { BrowserRouter } from 'react-router-dom';

// Mock child components to isolate unit testing
vi.mock('../components/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Nav</nav>,
}));

import { RafflesGoService, SightingsService } from '../api';
import { getAllDrafts } from '../services/SightingDraftsService';

const mockUser: Partial<User> = {
  displayName: 'John Doe',
  email: 'john@example.com',
  uid: 'test-uid-123',
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hourly: {
            time: ['2026-04-12T08:00', '2026-04-14T08:00'],
            precipitation_probability: [20, 10],
            weather_code: [1, 1],
          },
        }),
      })
    );
    vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({
      uid: 'test-uid-123',
      email: 'john@example.com',
      role: 'user',
    });
    vi.mocked(getAllDrafts).mockResolvedValue([]);
    vi.mocked(RafflesGoService.listSurveyWalksForCurrentUser).mockResolvedValue({
      surveyWalks: [
        {
          uid: 'walk-upcoming',
          surveyPeriodUid: 'period-1',
          surveyPeriodName: 'April 2026 Survey Period',
          name: 'MacRitchie Reservoir Loop',
          date: '2026-04-13T00:00:00.000Z',
          startTime: '07:30',
          endTime: '09:30',
          capacity: 8,
          isFinished: false,
          completedAt: null,
          volunteerUids: ['test-uid-123', 'user-2'],
          attendeeUids: [],
          volunteers: [
            { uid: 'test-uid-123', name: 'John Doe' },
            { uid: 'user-2', name: 'Jane Tan' },
          ],
          attendees: [],
          noShows: [
            { uid: 'test-uid-123', name: 'John Doe' },
            { uid: 'user-2', name: 'Jane Tan' },
          ],
          leader: { uid: 'leader-1', name: 'Alicia Lim' },
        },
        {
          uid: 'walk-later',
          surveyPeriodUid: 'period-1',
          surveyPeriodName: 'April 2026 Survey Period',
          name: 'Springleaf Trail',
          date: '2026-04-14T00:00:00.000Z',
          startTime: '08:00',
          endTime: '10:00',
          capacity: 10,
          isFinished: false,
          completedAt: null,
          volunteerUids: ['test-uid-123'],
          attendeeUids: [],
          volunteers: [{ uid: 'test-uid-123', name: 'John Doe' }],
          attendees: [],
          noShows: [{ uid: 'test-uid-123', name: 'John Doe' }],
          leader: { uid: 'leader-2', name: 'Benjamin Ng' },
        },
      ],
    });
    vi.mocked(SightingsService.getMySightingsDashboard).mockResolvedValue({
      stats: {
        totalSubmissions: 2,
        sightedCount: 1,
        notSightedCount: 1,
        uniqueLocations: 2,
        totalAdults: 2,
        totalJuveniles: 1,
        latestSubmissionAt: '2026-03-24T10:30:00.000Z',
        speciesBreakdown: [{ species: 'Raffles Banded Langur', count: 1 }],
      },
      sightings: [
        {
          id: 'sighting-1',
          surveyWalkUid: 'walk-1',
          result: 'sighted',
          date: '2026-03-24',
          time: '10:30',
          location: 'Route A',
          species: 'Raffles Banded Langur',
          adults: 2,
          juveniles: 1,
          behaviour: 'Resting',
          notes: 'Observed near the trail',
          submittedBy: 'test-uid-123',
          createdAt: '2026-03-24T10:30:00.000Z',
        },
        {
          id: 'sighting-2',
          surveyWalkUid: 'walk-2',
          result: 'not_sighted',
          date: '2026-03-23',
          time: '08:15',
          location: 'Route B',
          notes: '',
          submittedBy: 'test-uid-123',
          createdAt: '2026-03-23T08:15:00.000Z',
        },
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Test 1: Basic rendering and querying DOM elements
  it('renders welcome message with user name', async () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser as User} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByText('John Doe', { selector: '#volunteerName' })).toBeInTheDocument();
      expect(screen.getByText(/john@example.com/i)).toBeInTheDocument(); // Emal is displayed below the H1
    });
  });

  // Test 2: Async API calls with waitFor
  it('fetches user info and assigns variables properly', async () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser as User} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(RafflesGoService.getCurrentUser).toHaveBeenCalled();
      expect(SightingsService.getMySightingsDashboard).toHaveBeenCalled();
      expect(RafflesGoService.listSurveyWalksForCurrentUser).toHaveBeenCalled();
      expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
    });
  });

  it('renders aggregate stats and submitted sightings', async () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser as User} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/total submissions/i)).toBeInTheDocument();
      expect(screen.getByText(/routes covered/i)).toBeInTheDocument();
      expect(screen.getByText(/Raffles Banded Langur \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Observed near the trail/i)).toBeInTheDocument();
      expect(screen.getByText(/Result: Not sighted/i)).toBeInTheDocument();
    });
  });

  it('error when API fails', async () => {
    vi.mocked(RafflesGoService.getCurrentUser).mockRejectedValueOnce(new Error('API Error'));
    vi.mocked(SightingsService.getMySightingsDashboard).mockRejectedValueOnce(new Error('API Error'));

    render(
      <BrowserRouter>
        <Dashboard user={mockUser as User} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong getting your details/i)).toBeInTheDocument();
    });
  });

  it('shows a saved drafts quick action', async () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser as User} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /saved drafts/i })).toBeInTheDocument();
    });
  });

  it('renders the volunteer next upcoming walk', async () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser as User} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /next upcoming walk/i })).toBeInTheDocument();
      expect(screen.getByText(/MacRitchie Reservoir Loop/i)).toBeInTheDocument();
      expect(screen.getByText(/Leader: Alicia Lim/i)).toBeInTheDocument();
      expect(screen.getByText(/Volunteers: John Doe, Jane Tan/i)).toBeInTheDocument();
    });
  });

  it('shows a bad weather warning for the next upcoming walk when rain is forecast', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hourly: {
            time: ['2026-04-13T08:00'],
            precipitation_probability: [85],
            weather_code: [82],
          },
        }),
      })
    );

    render(
      <BrowserRouter>
        <Dashboard user={mockUser as User} />
      </BrowserRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/forecast warning: rain expected/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/85% chance of rain/i);
  });

  it('does not show a weather warning when the forecast is mild', async () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser as User} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/MacRitchie Reservoir Loop/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('shows an empty state when there are no upcoming walks', async () => {
    vi.mocked(RafflesGoService.listSurveyWalksForCurrentUser).mockResolvedValueOnce({
      surveyWalks: [],
    });

    render(
      <BrowserRouter>
        <Dashboard user={mockUser as User} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/you do not have any upcoming survey walks/i)).toBeInTheDocument();
    });
  });
});
