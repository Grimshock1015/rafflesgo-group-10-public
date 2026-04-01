import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { RafflesGoService } from '../api'
import type { User } from 'firebase/auth'
import { Button } from '@chakra-ui/react'

interface NavigationProps {
  user: User
}

export function Navigation({ user }: NavigationProps) {
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [role, setRole] = useState<'user' | 'admin' | null>(null)

  const handleLogout = async () => {
    await signOut(auth)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await RafflesGoService.getCurrentUser()
        setRole(response.role)
      } catch (error) {
        console.error('Failed to fetch current user role:', error)
        setRole('user')
      }
    }

    fetchRole()
  }, [user.uid])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const navContainer = target.closest('.main-nav')
      const navToggle = target.closest('.nav-toggle')
      
      if (isMobileMenuOpen && navContainer && !navToggle) {
        // If clicking inside nav but not on toggle button, check if it's a link
        const isNavLink = target.closest('.nav-link')
        if (!isNavLink) {
          closeMobileMenu()
        }
      } else if (isMobileMenuOpen && !navContainer) {
        // If clicking outside nav entirely, close menu
        closeMobileMenu()
      }
    }

    if (isMobileMenuOpen) {
      // Small delay to avoid immediate closure
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
      }, 100)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isMobileMenuOpen])

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="nav-brand">
          <img src="/assets/images/icons/icon.png" alt="Raffles Go Logo" className="logo" />
          <span className="brand-name">Raffles Go</span>
        </div>

        <button 
          className="nav-toggle" 
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>

        <div className={`nav-menu-wrapper ${isMobileMenuOpen ? 'open' : ''}`}>
          <ul className="nav-menu">
            <li>
              {
                 role === 'admin' && (
                   <Button backgroundColor={"green.fg"} onClick={() => {closeMobileMenu(); navigate('/survey-periods');}} px={2}>
                      Survey Periods
                   </Button>
                )
              }
            </li>

            <li>
              <Button backgroundColor={"green.fg"} onClick={() => {closeMobileMenu(); navigate('/submit-sighting');}} px={2}>
                Submit Sighting
              </Button>
            </li>

            <li>
              <Button backgroundColor={"green.fg"} onClick={() => {closeMobileMenu(); navigate('/drafts');}} px={2}>
                Saved Drafts
              </Button>
            </li>

            <li>
              <Button backgroundColor={"green.fg"} onClick={() => {closeMobileMenu(); navigate('/dashboard');}} px={2}>
                Dashboard
              </Button>
            </li>
          </ul>

          <div className="nav-actions">
            {/* <ThemeToggle /> */}
            <div className="user-menu mobile-user-menu">
              <span className="user-name">{user.displayName || user.email}</span>
              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
