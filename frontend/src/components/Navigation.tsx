import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import type { User } from 'firebase/auth'

interface NavigationProps {
  user: User
}

export function Navigation({ user }: NavigationProps) {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await signOut(auth)
  }

  const isActive = (path: string) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link'
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
            <li><Link to="/dashboard" className={isActive('/dashboard')} onClick={closeMobileMenu}>Dashboard</Link></li>
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
