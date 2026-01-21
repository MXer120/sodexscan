'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import '../styles/Navbar.css'

function Navbar() {
  const pathname = usePathname()

  const navLinks = [
    { path: '/tracker', label: 'Tracker' },
    { path: '/mainnet', label: 'Mainnet' },
  ]

  // More stars - only a few pulsate (marked with pulsate: true)
  const stars = [
    { left: '5%', top: '25%', pulsate: true },
    { left: '9%', top: '45%', pulsate: false },
    { left: '12%', top: '55%', pulsate: false },
    { left: '15%', top: '20%', pulsate: false },
    { left: '18%', top: '35%', pulsate: false },
    { left: '22%', top: '50%', pulsate: false },
    { left: '25%', top: '70%', pulsate: false },
    { left: '28%', top: '65%', pulsate: false },
    { left: '32%', top: '30%', pulsate: false },
    { left: '35%', top: '20%', pulsate: true },
    { left: '38%', top: '60%', pulsate: false },
    { left: '42%', top: '50%', pulsate: false },
    { left: '45%', top: '25%', pulsate: false },
    { left: '48%', top: '70%', pulsate: false },
    { left: '52%', top: '30%', pulsate: false },
    { left: '55%', top: '45%', pulsate: false },
    { left: '58%', top: '70%', pulsate: false },
    { left: '62%', top: '35%', pulsate: false },
    { left: '65%', top: '40%', pulsate: true },
    { left: '68%', top: '55%', pulsate: false },
    { left: '72%', top: '60%', pulsate: false },
    { left: '75%', top: '20%', pulsate: false },
    { left: '78%', top: '50%', pulsate: false },
    { left: '80%', top: '25%', pulsate: false },
    { left: '83%', top: '65%', pulsate: false },
    { left: '88%', top: '55%', pulsate: false },
    { left: '91%', top: '40%', pulsate: false },
    { left: '95%', top: '35%', pulsate: true },
  ]

  const isLandingPage = pathname === '/'

  return (
    <>
      <nav className={`navbar ${isLandingPage ? 'navbar-landing' : ''}`}>
        {/* Animated stars */}
        <div className="navbar-stars">
          {stars.map((star, i) => (
            <div
              key={i}
              className={`navbar-star ${star.pulsate ? 'pulsate' : ''}`}
              style={{ left: star.left, top: star.top }}
            />
          ))}
        </div>

        {/* Glow into navbar from below */}
        <div className="navbar-inner-glow"></div>

        <div className="navbar-container">
          <Link href="/" className="navbar-logo">
            <img src="/logo.svg" alt="Pukai" className="logo-icon" />
          </Link>

          <div className="navbar-links">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.path}
                  href={link.path}
                  className="nav-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`nav-link ${pathname === link.path ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </div>

        {/* Only show glow line on non-landing pages */}
        {<div className="navbar-glow"></div>}
      </nav>
    </>
  )
}

export default Navbar
