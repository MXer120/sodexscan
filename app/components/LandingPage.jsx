'use client'

import React from 'react'
import Link from 'next/link'
import '../styles/LandingPage.css'

function LandingPage() {
  return (
    <div className="landing-page">
      {/* Background image layer - below content, above navbar stars */}
      <div className="landing-bg-image"></div>

      {/* Hero section */}
      <section className="hero">
        <div className="hero-content">
          {/* Large PUKAI text */}
          <h1 className="hero-title">
            <img src="/pukai-text.svg" alt="PUKAI" className="hero-text-svg" />
          </h1>

          {/* CTA buttons */}
          <div className="hero-cta">
            <Link href="/tracker" className="cta-btn cta-primary">
              <span className="cta-dot"></span>
              TRACKER
              <span className="cta-arrow">↗</span>
            </Link>
          </div>

        </div>

        {/* Scroll down arrow - middle left */}
        <button className="scroll-down-btn" onClick={() => {
          const statsSection = document.querySelector('.stats-section');
          statsSection?.scrollIntoView({ behavior: 'smooth' });
        }}>
          ↓
        </button>

        {/* Documentation button - bottom middle right */}
        <a href="https://lutzs120.gitbook.io/pukai/" className="docs-btn" target="_blank" rel="noopener noreferrer">
          DOCUMENTATION ↗
        </a>
      </section>

      {/* Section divider */}
      <div className="section-divider">
        <div className="divider-line"></div>
      </div>

      {/* Stats section */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">NUMBER OF TRADES</div>
            <div className="stat-value">100K+ <span className="stat-unit">Trades</span></div>
          </div>
          <div className="stat-item">
            <div className="stat-label">TOTAL VOLUME</div>
            <div className="stat-value">2M+ <span className="stat-unit">Mag7</span></div>
          </div>
          <div className="stat-item">
            <div className="stat-label">REFRESH RATE</div>
            <div className="stat-value">20-100<span className="stat-unit">Hz</span></div>
          </div>
          <div className="stat-item">
            <div className="stat-label">EXECUTION SPEED</div>
            <div className="stat-value">&lt;100 <span className="stat-unit">ms</span></div>
          </div>
        </div>
      </section>

      {/* Products section */}
      <section className="products">
        <div className="products-header">[ RESOURCES ]</div>

        <div className="products-grid">
          {/* Card 1: Pukai */}
          <div className="product-card">
            <div className="card-content">
              <h3 className="card-title">Pukai</h3>
              <p className="card-description">
                Pukai is your cosmic guide, now accessible on pukai.com, iOS, and Android. Explore the universe with AI.
              </p>
            </div>
            <div className="card-visual">
              <img src="/pukai-logo.svg" alt="Pukai" className="card-logo" />
            </div>
            <a href="https://pukai.com" className="card-btn" target="_blank" rel="noopener noreferrer">
              USE NOW ↗
            </a>
          </div>

          {/* Card 2: Tracker */}
          <div className="product-card">
            <div className="card-content">
              <h3 className="card-title">Tracker</h3>
              <p className="card-description">
                Track wallet activity and performance metrics across testnet and mainnet.
              </p>
            </div>
            <div className="card-visual stats-visual">
              <div className="stats-chart">
                <div className="chart-bar" style={{height: '45%'}}></div>
                <div className="chart-bar" style={{height: '65%'}}></div>
                <div className="chart-bar" style={{height: '55%'}}></div>
                <div className="chart-bar" style={{height: '80%'}}></div>
                <div className="chart-bar" style={{height: '70%'}}></div>
                <div className="chart-bar" style={{height: '90%'}}></div>
                <div className="chart-bar" style={{height: '75%'}}></div>
              </div>
            </div>
            <Link href="/tracker" className="card-btn">
              VIEW NOW ↗
            </Link>
          </div>

          {/* Card 3: Developer Docs */}
          <div className="product-card">
            <div className="card-content">
              <h3 className="card-title">Developer Docs</h3>
              <p className="card-description">
                Learn how to quickly install Pukai at the heart of your applications and explore guides covering common use cases.
              </p>
            </div>
            <div className="card-visual docs-visual">
              <div className="docs-icon"></div>
            </div>
            <a href="https://lutzs120.gitbook.io/pukai/" className="card-btn" target="_blank" rel="noopener noreferrer">
              LEARN MORE ↗
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
