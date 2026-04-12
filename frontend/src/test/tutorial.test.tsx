import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { ProtectedLayout } from '../App'
import { RafflesGoService } from '../api'

vi.mock('../components/Navigation', () => ({
  Navigation: ({
    onOpenTutorial,
  }: {
    user: User
    onOpenTutorial: () => void
  }) => (
    <div>
      <div>Navigation</div>
      <button onClick={onOpenTutorial}>Tutorial</button>
    </div>
  ),
}))

vi.mock('../components/TutorialModal', () => ({
  default: ({
    onFinish,
    steps,
  }: {
    onFinish: () => void
    steps: { title: string }[]
  }) => (
    <div>
      <div>Tutorial Modal</div>
      <div>First step: {steps[0]?.title}</div>
      <button onClick={onFinish}>Finish Tutorial</button>
    </div>
  ),
}))

vi.mock('../constants/tutorialSteps', () => ({
  userTutorialSteps: [{ title: 'User Step 1' }],
  adminTutorialSteps: [{ title: 'Admin Step 1' }],
}))

vi.mock('../api', () => ({
  RafflesGoService: {
    getCurrentUser: vi.fn(),
  },
}))

function renderProtectedLayout(user: User | null) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<ProtectedLayout user={user} />}>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedLayout tutorial behavior', () => {
  const mockUser = {
    uid: 'user-123',
    displayName: 'Tommy',
    email: 'tommy@test.com',
  } as User

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('shows tutorial for first-time normal user', async () => {
    vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({
      uid: 'user-123',
      email: 'tommy@test.com',
      role: 'user',
    })

    renderProtectedLayout(mockUser)

    expect(await screen.findByText('Tutorial Modal')).toBeInTheDocument()
    expect(screen.getByText('First step: User Step 1')).toBeInTheDocument()
  })

  it('does not show tutorial for returning normal user', async () => {
    localStorage.setItem('hasSeenTutorial_user_user-123', 'true')

    vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({
      uid: 'user-123',
      email: 'tommy@test.com',
      role: 'user',
    })

    renderProtectedLayout(mockUser)

    await waitFor(() => {
      expect(screen.queryByText('Tutorial Modal')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })

  it('shows admin tutorial for first-time admin', async () => {
    vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({
      uid: 'user-123',
      email: 'tommy@test.com',
      role: 'admin',
    })

    renderProtectedLayout(mockUser)

    expect(await screen.findByText('Tutorial Modal')).toBeInTheDocument()
    expect(screen.getByText('First step: Admin Step 1')).toBeInTheDocument()
  })

  it('does not show tutorial for returning admin', async () => {
    localStorage.setItem('hasSeenTutorial_admin_user-123', 'true')

    vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({
      uid: 'user-123',
      email: 'tommy@test.com',
      role: 'admin',
    })

    renderProtectedLayout(mockUser)

    await waitFor(() => {
      expect(screen.queryByText('Tutorial Modal')).not.toBeInTheDocument()
    })
  })

  it('saves tutorial flag and hides modal when finish is clicked', async () => {
    vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({
      uid: 'user-123',
      email: 'tommy@test.com',
      role: 'user',
    })

    renderProtectedLayout(mockUser)

    expect(await screen.findByText('Tutorial Modal')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /finish tutorial/i }))

    expect(localStorage.getItem('hasSeenTutorial_user_user-123')).toBe('true')

    await waitFor(() => {
      expect(screen.queryByText('Tutorial Modal')).not.toBeInTheDocument()
    })
  })

  it('does not render tutorial before role check finishes', async () => {
    let resolveRequest!: (value: {
      uid: string
      email?: string
      role: 'user' | 'admin'
    }) => void

    const pendingPromise = new Promise<{
      uid: string
      email?: string
      role: 'user' | 'admin'
    }>((resolve) => {
      resolveRequest = resolve
    })

    vi.mocked(RafflesGoService.getCurrentUser).mockImplementation(
      () => pendingPromise as never
    )

    renderProtectedLayout(mockUser)

    expect(screen.queryByText('Tutorial Modal')).not.toBeInTheDocument()

    resolveRequest({
      uid: 'user-123',
      email: 'tommy@test.com',
      role: 'user',
    })

    expect(await screen.findByText('Tutorial Modal')).toBeInTheDocument()
  })

  it('falls back to user role when role fetch fails', async () => {
    vi.mocked(RafflesGoService.getCurrentUser).mockRejectedValue(
      new Error('failed')
    )

    renderProtectedLayout(mockUser)

    expect(await screen.findByText('Tutorial Modal')).toBeInTheDocument()
    expect(screen.getByText('First step: User Step 1')).toBeInTheDocument()
  })

  it('uses different localStorage keys for different users', async () => {
    localStorage.setItem('hasSeenTutorial_user_user-123', 'true')

    vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({
      uid: 'user-456',
      email: 'other@test.com',
      role: 'user',
    })

    const secondUser = {
      uid: 'user-456',
      displayName: 'Other User',
      email: 'other@test.com',
    } as User

    renderProtectedLayout(secondUser)

    expect(await screen.findByText('Tutorial Modal')).toBeInTheDocument()
  })

  it('opens tutorial when tutorial button in navigation is clicked', async () => {
    localStorage.setItem('hasSeenTutorial_user_user-123', 'true')

    vi.mocked(RafflesGoService.getCurrentUser).mockResolvedValue({
        uid: 'user-123',
        email: 'tommy@test.com',
        role: 'user',
    })

    renderProtectedLayout(mockUser)

    expect(screen.queryByText('Tutorial Modal')).not.toBeInTheDocument()

    fireEvent.click(await screen.findByRole('button', { name: /tutorial/i }))

    expect(await screen.findByText('Tutorial Modal')).toBeInTheDocument()
    expect(screen.getByText('First step: User Step 1')).toBeInTheDocument()
  })

})