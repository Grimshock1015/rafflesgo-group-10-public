import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../test-utils';
import SurveyPeriodGrid from '../../components/SurveyPeriodGrid';
import { BrowserRouter } from 'react-router-dom';
import { RafflesGoService } from '../../api';
import { toaster } from '../../components/ui/toaster';
import type { User } from 'firebase/auth';

// Mock child component to keep test focused
vi.mock('../../components/JoinSurveyPeriodButton', () => ({
    JoinSurveyPeriodButton: () => <button data-testid="join-button">Join</button>
}));

vi.mock('@/api', () => ({
    RafflesGoService: {
        listSurveyPeriods: vi.fn(),
        deleteSurveyPeriod: vi.fn(),
        getCurrentUser: vi.fn(),
    },
}));

vi.mock('../../components/ui/toaster', () => ({
    toaster: {
        create: vi.fn(),
    },
}));

const mockUser: Partial<User> = {
    uid: 'test-user',
};

describe('SurveyPeriodGrid', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({ role: 'user' } as never);
    });

    it('renders loading state initially', () => {
        // Return a promise that never resolves for this test to keep it in loading state
        vi.mocked(RafflesGoService.listSurveyPeriods).mockReturnValue(new Promise(() => { }) as never);

        render(
            <BrowserRouter>
                <SurveyPeriodGrid user={mockUser as User} />
            </BrowserRouter>
        );

        expect(screen.getByText('Loading survey periods...')).toBeInTheDocument();
    });

    it('renders empty state when no survey periods found', async () => {
        vi.mocked(RafflesGoService.listSurveyPeriods).mockResolvedValue({
            surveyPeriods: []
        } as never);

        render(
            <BrowserRouter>
                <SurveyPeriodGrid user={mockUser as User} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('No survey periods found.')).toBeInTheDocument();
        });
    });

    it('renders list of survey periods', async () => {
        vi.mocked(RafflesGoService.listSurveyPeriods).mockResolvedValue({
            surveyPeriods: [
                {
                    uid: 'sp-1',
                    name: 'Spring Survey 2026',
                    minWalks: 5,
                    startDate: '2026-03-01T00:00:00Z',
                    endDate: '2026-05-31T00:00:00Z',
                    isFinished: false,
                    volunteerUids: [],
                },
                {
                    uid: 'sp-2',
                    name: 'Winter Survey 2025',
                    minWalks: 3,
                    startDate: '2025-12-01T00:00:00Z',
                    endDate: '2026-02-28T00:00:00Z',
                    isFinished: true,
                    volunteerUids: [],
                }
            ]
        } as never);

        render(
            <BrowserRouter>
                <SurveyPeriodGrid user={mockUser as User} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Spring Survey 2026')).toBeInTheDocument();
            expect(screen.getByText('Winter Survey 2025')).toBeInTheDocument();
            expect(screen.getByText('Ongoing')).toBeInTheDocument();
            expect(screen.getByText('Finished')).toBeInTheDocument();
        });
    });

    it('handles deletion of a survey period', async () => {
        vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({ role: 'admin' } as never);

        vi.mocked(RafflesGoService.listSurveyPeriods).mockResolvedValueOnce({
            surveyPeriods: [
                {
                    uid: 'sp-1',
                    name: 'Spring Survey 2026',
                    minWalks: 5,
                    startDate: '2026-03-01T00:00:00Z',
                    endDate: '2026-05-31T00:00:00Z',
                    isFinished: false,
                    volunteerUids: [],
                }
            ]
        } as never).mockResolvedValueOnce({
            surveyPeriods: [] // Return empty list after deletion
        } as never);
        vi.mocked(RafflesGoService.deleteSurveyPeriod).mockResolvedValue({} as never);

        render(
            <BrowserRouter>
                <SurveyPeriodGrid user={mockUser as User} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Spring Survey 2026')).toBeInTheDocument();
        });

        // Click Delete button on the card
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));

        // Wait for dialog to open and confirm button to exist
        await waitFor(() => {
            const btns = screen.getAllByRole('button', { name: /delete/i });
            expect(btns.length).toBeGreaterThan(1);
        });
        const btns = screen.getAllByRole('button', { name: /delete/i });
        // The last one is inside the dialog
        fireEvent.click(btns[btns.length - 1]);

        await waitFor(() => {
            expect(RafflesGoService.deleteSurveyPeriod).toHaveBeenCalledWith('sp-1');
            expect(toaster.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
            // It fetches the list again
            expect(RafflesGoService.listSurveyPeriods).toHaveBeenCalledTimes(2);
        });
    });
});
