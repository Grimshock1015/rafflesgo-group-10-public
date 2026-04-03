/**
 * ⚠️  DISCLAIMER: This is a reference test file for students.
 *     These tests may break as you modify the Dashboard component.
 *     Update or remove tests as needed when making changes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from './test-utils';
import Dashboard from '../pages/Dashboard';
import type { User } from 'firebase/auth';

// Mock the API service
vi.mock('../api', () => ({
  RafflesGoService: {
    sayHello: vi.fn(),
    getCurrentUser: vi.fn(),
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
    vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({
      uid: 'test-uid-123',
      email: 'john@example.com',
      role: 'user',
    });
    vi.mocked(getAllDrafts).mockResolvedValue([]);
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

  // Test 1: Basic rendering and querying DOM elements
  it('renders welcome message with user name', async () => {
    render(
      <BrowserRouter>
        <Dashboard user={mockUser as User} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument(); // Name is in a <span>
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
});
