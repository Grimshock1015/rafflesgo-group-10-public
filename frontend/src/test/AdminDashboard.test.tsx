import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { render } from './test-utils';
import AdminDashboard from '../pages/AdminDashboard';
import { exportAdminDataToGoogleSheets } from '../utils/googleSheetsExport';
import { listAllAdminSightings } from '../lib/adminSightings';

vi.mock('../api', () => ({
  RafflesGoService: {
    getCurrentUser: vi.fn(),
    listUsers: vi.fn(),
    listSurveyPeriods: vi.fn(),
    listSurveyWalks: vi.fn(),
    changeUserRole: vi.fn(),
    updateUserStatus: vi.fn(),
  },
}));

vi.mock('../utils/googleSheetsExport', () => ({
  exportAdminDataToGoogleSheets: vi.fn(),
}));

vi.mock('../lib/adminSightings', () => ({
  listAllAdminSightings: vi.fn(),
}));

import { RafflesGoService } from '../api';

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));

    vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({
      uid: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    });
    vi.mocked(RafflesGoService.listUsers).mockResolvedValue({
      users: [
        {
          uid: 'admin-1',
          email: 'admin@example.com',
          displayName: 'Admin User',
          photoURL: 'https://example.com/admin.png',
          disabled: false,
          createdAt: '2026-03-01T09:00:00.000Z',
          role: 'admin',
        },
        {
          uid: 'user-2',
          email: 'user@example.com',
          displayName: 'Volunteer User',
          photoURL: 'https://example.com/user.png',
          disabled: false,
          createdAt: '2026-03-02T09:00:00.000Z',
          role: 'user',
        },
      ],
    });
    vi.mocked(RafflesGoService.listSurveyPeriods).mockResolvedValue({
      surveyPeriods: [
        {
          uid: 'period-1',
          name: 'March Census',
          startDate: '2026-03-01T00:00:00.000Z',
          endDate: '2026-03-31T23:59:59.000Z',
          isFinished: false,
          isActive: true,
          minWalks: 2,
        },
      ],
    });
    vi.mocked(RafflesGoService.listSurveyWalks).mockResolvedValue({
      surveyWalks: [
        {
          uid: 'walk-1',
          surveyPeriodUid: 'period-1',
          surveyPeriodName: 'March Census',
          name: 'Southern Loop',
          date: '2026-03-24T00:00:00.000Z',
          startTime: '09:00',
          endTime: '11:00',
          capacity: 6,
          isFinished: false,
          completedAt: null,
          volunteerUids: ['user-2'],
          attendeeUids: [],
          volunteers: [{ uid: 'user-2', name: 'Volunteer User' }],
          attendees: [],
          noShows: [{ uid: 'user-2', name: 'Volunteer User' }],
          leader: { uid: 'admin-1', name: 'Admin User' },
        },
      ],
    });
    vi.mocked(listAllAdminSightings).mockResolvedValue({
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
          submittedBy: 'user-2',
          createdAt: '2026-03-24T10:30:00.000Z',
        },
      ],
    });
    vi.mocked(RafflesGoService.changeUserRole).mockResolvedValue({
      success: true,
      email: 'user@example.com',
      role: 'admin',
    });
    vi.mocked(RafflesGoService.updateUserStatus).mockResolvedValue({
      success: true,
      uid: 'user-2',
      disabled: true,
    });
  });

  it('renders admin overview and user management sections', async () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/user management/i)).toBeInTheDocument();
      expect(screen.getByText(/volunteer user/i)).toBeInTheDocument();
      expect(screen.getByAltText(/volunteer user profile/i)).toBeInTheDocument();
      expect(screen.getByText(/total sightings/i)).toBeInTheDocument();
    });
  });

  it('allows admins to promote a user', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /make admin/i }));

    await waitFor(() => {
      expect(RafflesGoService.changeUserRole).toHaveBeenCalledWith({
        email: 'user@example.com',
        role: 'admin',
      });
    });
  });

  it('exports the admin dataset to a Google Sheets workbook', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /export to excel file/i }));

    await waitFor(() => {
      expect(exportAdminDataToGoogleSheets).toHaveBeenCalledWith(expect.objectContaining({
        users: expect.arrayContaining([
          expect.objectContaining({ uid: 'admin-1' }),
        ]),
        surveyPeriods: expect.arrayContaining([
          expect.objectContaining({ uid: 'period-1' }),
        ]),
        surveyWalks: expect.arrayContaining([
          expect.objectContaining({ uid: 'walk-1' }),
        ]),
        sightings: expect.arrayContaining([
          expect.objectContaining({ id: 'sighting-1' }),
        ]),
      }));
    });
  });
});
