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
}));

import { BrowserRouter } from 'react-router-dom';

// Mock child components to isolate unit testing
vi.mock('../components/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Nav</nav>,
}));

import { RafflesGoService } from '../api';

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
      expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
    });
  });

  it('error when API fails', async () => {
    vi.mocked(RafflesGoService.getCurrentUser).mockRejectedValueOnce(new Error('API Error'));

    render(
      <BrowserRouter>
        <Dashboard user={mockUser as User} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong getting your details/i)).toBeInTheDocument();
    });
  });
});
