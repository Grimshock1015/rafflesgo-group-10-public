import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { render } from '../test-utils';
import SurveyWalkGrid from '../../components/SurveyWalkGrid';
import { RafflesGoService } from '../../api';
import { toaster } from '../../components/ui/toaster';
import type { User } from 'firebase/auth';

vi.mock('@/api', () => ({
    RafflesGoService: {
        listSurveyWalksForCurrentUser: vi.fn(),
        joinSurveyWalk: vi.fn(),
        quitSurveyWalk: vi.fn(),
        reassignSurveyWalkLeader: vi.fn(),
    },
}));

vi.mock('../../components/ui/toaster', () => ({
    toaster: {
        create: vi.fn(),
    },
}));

const mockUser: Partial<User> = {
    uid: 'user-1',
};

describe('SurveyWalkGrid', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
});
