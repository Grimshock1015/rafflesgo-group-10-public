import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../test-utils';
import EditSurveyPeriod from '../../pages/EditSurveyPeriod';
import { BrowserRouter } from 'react-router-dom';
import { RafflesGoService } from '../../api';
import { toaster } from '../../components/ui/toaster';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ surveyPeriodId: 'test-id' })
    };
});

vi.mock('@/api/services/RafflesGoService', () => ({
    RafflesGoService: {
        getSurveyPeriod: vi.fn(),
        updateSurveyPeriod: vi.fn(),
    },
}));

vi.mock('../../components/ui/toaster', () => ({
    toaster: {
        create: vi.fn(),
    },
}));

// Mock DateRangePicker to simplify the test
vi.mock('../../components/DateRangePicker', () => ({
    DateRangePicker: ({ onChange }: { onChange: (dates: { year: number, month: number, day: number }[]) => void }) => {
        return (
            <button type="button" data-testid="mock-date-picker" onClick={() => onChange([{ year: 2026, month: 4, day: 1 }, { year: 2026, month: 4, day: 30 }])}>
                Set Dates
            </button>
        );
    }
}));

vi.mock('../../lib/date', () => ({
    toIsoDateTime: vi.fn().mockReturnValue('2026-04-01T00:00:00Z')
}));

describe('EditSurveyPeriod', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches and populates form data correctly', async () => {
        vi.mocked(RafflesGoService.getSurveyPeriod).mockResolvedValue({
            uid: 'test-id',
            name: 'Existing SP',
            minWalks: 10,
            startDate: '2026-04-01T00:00:00Z',
            endDate: '2026-04-30T00:00:00Z',
            isFinished: false,
            volunteerUids: [],
        } as never);

        render(
            <BrowserRouter>
                <EditSurveyPeriod />
            </BrowserRouter>
        );

        // Initial loading might be brief, wait for inputs to be populated
        await waitFor(() => {
            const inputs = screen.getAllByRole('textbox');
            expect((inputs[0] as HTMLInputElement).value).toBe('Existing SP');
            expect((inputs[1] as HTMLInputElement).value).toBe('10');
        });

        expect(RafflesGoService.getSurveyPeriod).toHaveBeenCalledWith('test-id');
    });

    it('submits form successfully', async () => {
        vi.mocked(RafflesGoService.getSurveyPeriod).mockResolvedValue({
            uid: 'test-id',
            name: 'Existing SP',
            minWalks: 10,
            startDate: '2026-04-01T00:00:00Z',
            endDate: '2026-04-30T00:00:00Z',
            isFinished: false,
            volunteerUids: [],
        } as never);
        vi.mocked(RafflesGoService.updateSurveyPeriod).mockResolvedValue({
            uid: 'test-id',
            name: 'Updated SP',
            minWalks: 15,
            startDate: '2026-04-01T00:00:00Z',
            endDate: '2026-04-30T00:00:00Z',
            isFinished: true,
            volunteerUids: [],
        } as never);

        render(
            <BrowserRouter>
                <EditSurveyPeriod />
            </BrowserRouter>
        );

        await waitFor(() => {
            const inputs = screen.getAllByRole('textbox');
            expect((inputs[0] as HTMLInputElement).value).toBe('Existing SP');
        });

        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: 'Updated SP' } });
        fireEvent.change(inputs[1], { target: { value: '15' } });
        fireEvent.click(screen.getByTestId('mock-date-picker'));

        const form = document.querySelector('form');
        if (form) {
            fireEvent.submit(form);
        }

        await waitFor(() => {
            expect(RafflesGoService.updateSurveyPeriod).toHaveBeenCalledWith('test-id', {
                name: 'Updated SP',
                minWalks: 15,
                startDate: '2026-04-01T00:00:00Z',
                endDate: '2026-04-01T00:00:00Z', // toIsoDateTime is mocked
                isFinished: false
            });
            expect(mockNavigate).toHaveBeenCalledWith('/survey-periods');
            expect(toaster.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
        });
    });

    it('handles submission error', async () => {
        vi.mocked(RafflesGoService.getSurveyPeriod).mockResolvedValue({
            uid: 'test-id',
            name: 'Existing SP',
            minWalks: 10,
            startDate: '2026-04-01T00:00:00Z',
            endDate: '2026-04-30T00:00:00Z',
            isFinished: false,
            volunteerUids: [],
        } as never);
        vi.mocked(RafflesGoService.updateSurveyPeriod).mockRejectedValue(new Error('Update failed'));

        render(
            <BrowserRouter>
                <EditSurveyPeriod />
            </BrowserRouter>
        );

        await waitFor(() => {
            const inputs = screen.getAllByRole('textbox');
            expect((inputs[0] as HTMLInputElement).value).toBe('Existing SP');
        });

        fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

        await waitFor(() => {
            expect(toaster.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
        });
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
