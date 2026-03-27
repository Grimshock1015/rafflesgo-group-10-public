import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../test-utils';
import CreateSurveyPeriod from '../../pages/CreateSurveyPeriod';
import { BrowserRouter } from 'react-router-dom';
import { RafflesGoService } from '../../api';
import { toaster } from '../../components/ui/toaster';

// Partially mock react-router-dom to check navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('@/api/services/RafflesGoService', () => ({
    RafflesGoService: {
        createSurveyPeriod: vi.fn(),
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

describe('CreateSurveyPeriod', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders form elements correctly', () => {
        render(
            <BrowserRouter>
                <CreateSurveyPeriod />
            </BrowserRouter>
        );
        expect(screen.getByText('Create Survey Period')).toBeInTheDocument();
        expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: /add survey period/i })).toBeInTheDocument();
    });

    it('submits form successfully', async () => {
        vi.mocked(RafflesGoService.createSurveyPeriod).mockResolvedValue({
            uid: 'new-id',
            name: 'New SP',
            minWalks: 5,
            startDate: '2026-04-01T00:00:00Z',
            endDate: '2026-04-30T00:00:00Z',
            isFinished: false,
            volunteerUids: [],
        } as never);

        render(
            <BrowserRouter>
                <CreateSurveyPeriod />
            </BrowserRouter>
        );

        const inputs = screen.getAllByRole('textbox');
        // First input is usually Name, second is Min walks
        fireEvent.change(inputs[0], { target: { value: 'New SP' } });
        fireEvent.change(inputs[1], { target: { value: '5' } });

        // Trigger date selection
        fireEvent.click(screen.getByTestId('mock-date-picker'));

        fireEvent.click(screen.getByRole('button', { name: /add survey period/i }));

        await waitFor(() => {
            expect(RafflesGoService.createSurveyPeriod).toHaveBeenCalledWith({
                name: 'New SP',
                minWalks: 5,
                startDate: '2026-04-01T00:00:00Z',
                endDate: '2026-04-01T00:00:00Z', // toIsoDateTime is mocked to return the same string
                isFinished: false
            });
            expect(mockNavigate).toHaveBeenCalledWith('/survey-periods');
            expect(toaster.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
        });
    });

    it('handles submission error', async () => {
        vi.mocked(RafflesGoService.createSurveyPeriod).mockRejectedValue(new Error('API Error'));

        render(
            <BrowserRouter>
                <CreateSurveyPeriod />
            </BrowserRouter>
        );

        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: 'New SP' } });

        fireEvent.click(screen.getByRole('button', { name: /add survey period/i }));

        await waitFor(() => {
            expect(toaster.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
        });
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
