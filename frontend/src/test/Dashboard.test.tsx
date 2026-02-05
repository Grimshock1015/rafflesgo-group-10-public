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
  },
}));

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
  });

  // Test 1: Basic rendering and querying DOM elements
  it('renders welcome message with user name', () => {
    vi.mocked(RafflesGoService.sayHello).mockResolvedValue({ message: 'Hello!' });

    render(<Dashboard user={mockUser as User} />);

    expect(screen.getByText(/welcome back,/i)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument(); // Name is in a <span>
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  // Test 2: Async API calls with waitFor
  it('fetches and displays hello message from API', async () => {
    vi.mocked(RafflesGoService.sayHello).mockResolvedValue({
      message: 'Hello, John Doe!',
    });

    render(<Dashboard user={mockUser as User} />);

    await waitFor(() => {
      expect(screen.getByText('Hello, John Doe!')).toBeInTheDocument();
    });

    expect(RafflesGoService.sayHello).toHaveBeenCalledWith('John Doe');
  });

  // Test 3: Testing with different props (edge case)
  it('falls back to "Volunteer" when user has no display name', () => {
    vi.mocked(RafflesGoService.sayHello).mockResolvedValue({ message: 'Hi!' });

    render(<Dashboard user={{ ...mockUser, displayName: null } as User} />);

    expect(screen.getByText('Volunteer')).toBeInTheDocument(); // Name is in a <span>
    expect(RafflesGoService.sayHello).toHaveBeenCalledWith('Volunteer');
  });
});
