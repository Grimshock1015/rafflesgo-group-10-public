import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils';
import SurveyWalkGrid from '../../components/SurveyWalkGrid';
import { RafflesGoService } from '../../api';
import { toaster } from '../../components/ui/toaster';
import type { User } from 'firebase/auth';
import { listAdminSightingsForSurveyWalk } from '../../lib/adminSightings';

vi.mock('@/api', () => ({
    RafflesGoService: {
        getCurrentUser: vi.fn(),
        listSurveyWalks: vi.fn(),
        listSurveyWalksForCurrentUser: vi.fn(),
        joinSurveyWalk: vi.fn(),
        quitSurveyWalk: vi.fn(),
        reassignSurveyWalkLeader: vi.fn(),
        completeSurveyWalk: vi.fn(),
    },
    SightingsService: {
        deleteSighting: vi.fn(),
    },
}));

vi.mock('../../components/ui/toaster', () => ({
    toaster: {
        create: vi.fn(),
    },
}));

vi.mock('../../lib/adminSightings', () => ({
    buildAdminSightingStats: vi.fn((sightings) => ({
        totalSubmissions: sightings.length,
        sightedCount: sightings.filter((sighting: { result: string }) => sighting.result === 'sighted').length,
        notSightedCount: sightings.filter((sighting: { result: string }) => sighting.result !== 'sighted').length,
        uniqueLocations: new Set(sightings.map((sighting: { location: string }) => sighting.location)).size,
        totalAdults: sightings.reduce((sum: number, sighting: { adults?: number }) => sum + (sighting.adults ?? 0), 0),
        totalJuveniles: sightings.reduce((sum: number, sighting: { juveniles?: number }) => sum + (sighting.juveniles ?? 0), 0),
        latestSubmissionAt: sightings[0]?.createdAt,
        speciesBreakdown: [],
    })),
    listAdminSightingsForSurveyWalk: vi.fn(),
}));

const mockUser: Partial<User> = {
    uid: 'user-1',
};

describe('SurveyWalkGrid', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({ role: 'user' } as never);
    });

    it('renders loading state initially', () => {
        vi.mocked(RafflesGoService.listSurveyWalksForCurrentUser).mockReturnValue(new Promise(() => {}) as never);

        render(<SurveyWalkGrid user={mockUser as User} />);

        expect(screen.getByText('Loading survey walks...')).toBeInTheDocument();
    });

    it('renders empty state when no survey walks are available', async () => {
        vi.mocked(RafflesGoService.listSurveyWalksForCurrentUser).mockResolvedValue({
            surveyWalks: [],
        } as never);

        render(<SurveyWalkGrid user={mockUser as User} />);

        await waitFor(() => {
            expect(screen.getByText('No survey walks found.')).toBeInTheDocument();
        });
    });

    it('joins a survey walk and refreshes list', async () => {
        vi.mocked(RafflesGoService.listSurveyWalksForCurrentUser)
            .mockResolvedValueOnce({
                surveyWalks: [
                    {
                        uid: 'walk-1',
                        surveyPeriodUid: 'period-1',
                        surveyPeriodName: 'Spring 2026',
                        name: 'Morning Walk',
                        date: '2026-04-10T00:00:00.000Z',
                        startTime: '08:00',
                        endTime: '10:00',
                        capacity: 4,
                        isFinished: false,
                        volunteers: [],
                        leader: { uid: '', name: '' },
                    },
                ],
            } as never)
            .mockResolvedValueOnce({
                surveyWalks: [
                    {
                        uid: 'walk-1',
                        surveyPeriodUid: 'period-1',
                        surveyPeriodName: 'Spring 2026',
                        name: 'Morning Walk',
                        date: '2026-04-10T00:00:00.000Z',
                        startTime: '08:00',
                        endTime: '10:00',
                        capacity: 4,
                        isFinished: false,
                        volunteers: [{ uid: 'user-1', name: 'You' }],
                        leader: { uid: 'user-1', name: 'You' },
                    },
                ],
            } as never);

        vi.mocked(RafflesGoService.joinSurveyWalk).mockResolvedValue({ success: true } as never);

        render(<SurveyWalkGrid user={mockUser as User} />);

        await waitFor(() => {
            expect(screen.getByText('Morning Walk')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /join/i }));

        await waitFor(() => {
            expect(RafflesGoService.joinSurveyWalk).toHaveBeenCalledWith('walk-1');
            expect(RafflesGoService.listSurveyWalksForCurrentUser).toHaveBeenCalledTimes(2);
            expect(toaster.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
        });
    });

    it('renders profile pictures next to participant names', async () => {
        vi.mocked(RafflesGoService.listSurveyWalksForCurrentUser).mockResolvedValue({
            surveyWalks: [
                {
                    uid: 'walk-1',
                    surveyPeriodUid: 'period-1',
                    surveyPeriodName: 'Spring 2026',
                    name: 'Morning Walk',
                    date: '2026-04-10T00:00:00.000Z',
                    startTime: '08:00',
                    endTime: '10:00',
                    capacity: 4,
                    isFinished: false,
                    volunteerUids: ['user-1', 'user-2'],
                    attendeeUids: [],
                    completedAt: null,
                    volunteers: [
                        { uid: 'user-1', name: 'Alex Tan', photoURL: 'https://example.com/alex.png' },
                        { uid: 'user-2', name: 'Bea Lim' },
                    ],
                    attendees: [],
                    noShows: [],
                    leader: { uid: 'user-1', name: 'Alex Tan', photoURL: 'https://example.com/alex.png' },
                },
            ],
        } as never);

        render(<SurveyWalkGrid user={mockUser as User} />);

        await waitFor(() => {
            expect(screen.getByText('Morning Walk')).toBeInTheDocument();
        });

        await userEvent.click(screen.getByRole('button', { name: /view details/i }));

        expect(screen.getAllByAltText('Alex Tan profile')).toHaveLength(2);
        expect(screen.getByLabelText('Bea Lim fallback avatar')).toBeInTheDocument();
    });

    it('uses generic avatar image when profile image fails to load', async () => {
        vi.mocked(RafflesGoService.listSurveyWalksForCurrentUser).mockResolvedValue({
            surveyWalks: [
                {
                    uid: 'walk-1',
                    surveyPeriodUid: 'period-1',
                    surveyPeriodName: 'Spring 2026',
                    name: 'Morning Walk',
                    date: '2026-04-10T00:00:00.000Z',
                    startTime: '08:00',
                    endTime: '10:00',
                    capacity: 4,
                    isFinished: false,
                    volunteerUids: ['user-1'],
                    attendeeUids: [],
                    completedAt: null,
                    volunteers: [
                        { uid: 'user-1', name: 'Alex Tan', photoURL: 'https://example.com/alex.png' },
                    ],
                    attendees: [],
                    noShows: [],
                    leader: { uid: 'user-1', name: 'Alex Tan', photoURL: 'https://example.com/alex.png' },
                },
            ],
        } as never);

        render(<SurveyWalkGrid user={mockUser as User} />);

        await waitFor(() => {
            expect(screen.getByText('Morning Walk')).toBeInTheDocument();
        });

        const [leaderAvatar] = screen.getAllByAltText('Alex Tan profile');
        fireEvent.error(leaderAvatar);

        await waitFor(() => {
            expect(leaderAvatar).toHaveAttribute('src', expect.stringContaining('/assets/images/avatars/icon.png'));
        });
    });

    it('shows mark complete for the leader even when the walk is in the future', async () => {
        vi.mocked(RafflesGoService.listSurveyWalksForCurrentUser).mockResolvedValue({
            surveyWalks: [
                {
                    uid: 'walk-1',
                    surveyPeriodUid: 'period-1',
                    surveyPeriodName: 'Spring 2026',
                    name: 'Morning Walk',
                    date: '2026-04-10T00:00:00.000Z',
                    startTime: '08:00',
                    endTime: '10:00',
                    capacity: 4,
                    isFinished: false,
                    volunteerUids: ['user-1'],
                    attendeeUids: [],
                    completedAt: null,
                    volunteers: [{ uid: 'user-1', name: 'Alex Tan' }],
                    attendees: [],
                    noShows: [],
                    leader: { uid: 'user-1', name: 'Alex Tan' },
                },
            ],
        } as never);

        render(<SurveyWalkGrid user={mockUser as User} />);

        await waitFor(() => {
            expect(screen.getByText('Morning Walk')).toBeInTheDocument();
        });

        expect(
            screen.getByRole('button', { name: /mark complete/i }),
        ).toBeInTheDocument();
    });

    it('lets admins open walk sightings and review submission media', async () => {
        vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({ role: 'admin' } as never);
        vi.mocked(RafflesGoService.listSurveyWalksForCurrentUser).mockResolvedValue({
            surveyWalks: [
                {
                    uid: 'walk-1',
                    surveyPeriodUid: 'period-1',
                    surveyPeriodName: 'Spring 2026',
                    name: 'Morning Walk',
                    date: '2026-04-10T00:00:00.000Z',
                    startTime: '08:00',
                    endTime: '10:00',
                    capacity: 4,
                    isFinished: false,
                    volunteerUids: ['user-1'],
                    attendeeUids: [],
                    completedAt: null,
                    volunteers: [{ uid: 'user-1', name: 'Alex Tan' }],
                    attendees: [],
                    noShows: [],
                    leader: { uid: 'user-1', name: 'Alex Tan' },
                },
            ],
        } as never);
        vi.mocked(listAdminSightingsForSurveyWalk).mockResolvedValue({
            sightings: [
                {
                    id: 'sighting-1',
                    surveyWalkUid: 'walk-1',
                    result: 'sighted',
                    date: '2026-04-10',
                    time: '09:15',
                    location: 'Trail One',
                    species: 'Raffles Banded Langur',
                    adults: 2,
                    juveniles: 1,
                    behaviour: 'Feeding',
                    notes: 'Observed near the stream',
                    submittedBy: 'user-1',
                    mediaUrl: 'https://example.com/langur.jpg',
                    createdAt: '2026-04-10T09:15:00.000Z',
                },
            ],
            stats: {
                totalSubmissions: 1,
                sightedCount: 1,
                notSightedCount: 0,
                uniqueLocations: 1,
                totalAdults: 2,
                totalJuveniles: 1,
                latestSubmissionAt: '2026-04-10T09:15:00.000Z',
                speciesBreakdown: [{ species: 'Raffles Banded Langur', count: 1 }],
            },
        });

        render(<SurveyWalkGrid user={mockUser as User} />);

        await waitFor(() => {
            expect(screen.getByText('Morning Walk')).toBeInTheDocument();
        });

        await userEvent.click(await screen.findByRole('button', { name: /view sightings/i }));

        await waitFor(() => {
            expect(listAdminSightingsForSurveyWalk).toHaveBeenCalledWith('walk-1');
            expect(screen.getByText(/raffles banded langur/i)).toBeInTheDocument();
            expect(screen.getByText(/observed near the stream/i)).toBeInTheDocument();
            expect(screen.getByAltText(/submission media/i)).toBeInTheDocument();
        });
    });
});
