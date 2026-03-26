import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../test-utils';
import SurveyPeriodList from '../../pages/SurveyPeriodList';
import { BrowserRouter } from 'react-router-dom';
import type { User } from 'firebase/auth';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock the child component so we don't need to test its complex logic here
vi.mock('../../components/SurveyPeriodGrid', () => ({
    default: () => <div data-testid="survey-period-grid">SurveyPeriodGrid</div>
}));

const mockUser: Partial<User> = {
    uid: 'test-user-id',
};

describe('SurveyPeriodList', () => {
    it('renders correctly', () => {
        render(
            <BrowserRouter>
                <SurveyPeriodList user={mockUser as User} />
            </BrowserRouter>
        );
        expect(screen.getByText('List of Survey Periods')).toBeInTheDocument();
        expect(screen.getByTestId('survey-period-grid')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create new/i })).toBeInTheDocument();
    });

    it('navigates to create survey period page when button is clicked', () => {
        render(
            <BrowserRouter>
                <SurveyPeriodList user={mockUser as User} />
            </BrowserRouter>
        );

        screen.getByRole('button', { name: /create new/i }).click();
        expect(mockNavigate).toHaveBeenCalledWith('/create-survey-period');
    });
});
