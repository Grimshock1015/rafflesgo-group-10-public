import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import type { User } from 'firebase/auth'
import { Box, Button, Tabs } from '@chakra-ui/react'
import { RafflesGoService } from '../api'
import { useTheme } from '../contexts/ThemeContext'

interface NavigationProps {
  user: User
}

export function Navigation({ user }: NavigationProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const { effectiveTheme } = useTheme()

  const tabText = effectiveTheme === 'dark' ? 'whiteAlpha.900' : 'gray.700'
  const brandGreen = 'var(--primary-green)'
  const tabLineColor = effectiveTheme === 'dark' ? 'var(--light-green)' : 'var(--primary-green)'
  const tabLineWidth = effectiveTheme === 'dark' ? '4px' : '3px'
  const tabBorderBottomWidth = { base: '0px', md: tabLineWidth }
  const selectedTabStyles = {
    color: brandGreen,
    borderBottomColor: { base: 'transparent', md: tabLineColor },
  }

  const activeTab = (() => {
    if (location.pathname.startsWith('/submit-sighting')) return 'submit-sighting'
    if (location.pathname.startsWith('/dashboard')) return 'dashboard'
    if (location.pathname.startsWith('/admin')) return 'admin'
    return 'survey-walks'
  })()

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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const navContainer = target.closest('.main-nav')
      const navToggle = target.closest('.nav-toggle')
      
      if (isMobileMenuOpen && navContainer && !navToggle) {
        // If clicking inside nav but not on toggle button, check if it's a tab trigger
        const isNavLink = target.closest('[data-nav-link]')
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

  useEffect(() => {
    let isMounted = true

    const fetchRole = async () => {
      try {
        const response = await RafflesGoService.getCurrentUser()
        if (isMounted) {
          setRole(response.role)
        }
      } catch {
        if (isMounted) {
          setRole('user')
        }
      }
    }

    fetchRole()

    return () => {
      isMounted = false
    }
  }, [user.uid])

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="nav-brand">
          <img src="/assets/images/icons/icon-nobg.png" alt="Raffles Go Logo" className="logo" />
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
          <Tabs.Root value={activeTab} className="nav-menu">
            <Tabs.List gap={5} className="nav-menu-list">

              <Tabs.Trigger
                value="dashboard"
                className="nav-link"
                data-nav-link
                color={tabText}
                borderBottomWidth={tabBorderBottomWidth}
                borderBottomStyle="solid"
                borderBottomColor="transparent"
                _hover={{ color: brandGreen }}
                _selected={selectedTabStyles}
                onClick={() => { closeMobileMenu(); navigate('/dashboard'); }}
              >
                Dashboard
              </Tabs.Trigger>

              {role === 'admin' && (
                <Tabs.Trigger
                  value="admin"
                  className="nav-link"
                  data-nav-link
                  color={tabText}
                  borderBottomWidth={tabBorderBottomWidth}
                  borderBottomStyle="solid"
                  borderBottomColor="transparent"
                  _hover={{ color: brandGreen }}
                  _selected={selectedTabStyles}
                  onClick={() => { closeMobileMenu(); navigate('/admin'); }}
                >
                  Admin Dashboard
                </Tabs.Trigger>
              )}

              <Tabs.Trigger
                value="survey-walks"
                className="nav-link"
                data-nav-link
                color={tabText}
                borderBottomWidth={tabBorderBottomWidth}
                borderBottomStyle="solid"
                borderBottomColor="transparent"
                _hover={{ color: brandGreen }}
                _selected={selectedTabStyles}
                onClick={() => { closeMobileMenu(); navigate('/survey-walks'); }}
              >
                Survey Walks
              </Tabs.Trigger>

              <Tabs.Trigger
                value="submit-sighting"
                className="nav-link"
                data-nav-link
                color={tabText}
                borderBottomWidth={tabBorderBottomWidth}
                borderBottomStyle="solid"
                borderBottomColor="transparent"
                _hover={{ color: brandGreen }}
                _selected={selectedTabStyles}
                onClick={() => { closeMobileMenu(); navigate('/submit-sighting'); }}
              >
                Submit Sighting
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>

          <div className="nav-actions">
            {/* <ThemeToggle /> */}
            <div className="user-menu mobile-user-menu">
              <Box as="span" className="user-menu-label" color={brandGreen}>
                {user.displayName || user.email}
              </Box>
              <Button
                onClick={handleLogout}
                size="sm"
                className="user-menu-logout"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
