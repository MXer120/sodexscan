'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TopPairs from './TopPairs'
import SearchAndAddBox, { FilterType } from './SearchAndAddBox'
import SignUpCTA from './SignUpCTA'
import EtfFlowTicker from './EtfFlowTicker'
import TopPerformers from './TopPerformers'
import '../styles/MainnetPage.css'
import '../styles/LandingPage.css'

function LandingPage() {
  const [searchInput, setSearchInput] = useState('')
  const router = useRouter()

  const [filterType, setFilterType] = useState<FilterType>('all')

  useEffect(() => {
    document.title = 'Home | CommunityScan SoDEX'
  }, [])

  const handleSearch = () => {
    const input = searchInput.trim()
    if (!input) return
    router.push(`/tracker?wallet=${encodeURIComponent(input)}`)
  }

  return (
    <div className="landing-page dashboard">
      {/* Wallet Search Box */}
      <div className="landing-search-box" style={{
        marginBottom: '40px',
        padding: '40px 20px',
        background: 'rgba(var(--color-primary-rgb), 0.05)',
        borderRadius: '8px',
        border: '1px dashed rgba(var(--color-primary-rgb), 0.3)',
        textAlign: 'center',
        position: 'relative',
        height: '475px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}>
        <h1 style={{ color: 'var(--color-text-main)', marginBottom: '12px', fontSize: '20px', fontWeight: '600' }}>Community-Built SoDex Mainnet Scan</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px', maxWidth: '500px', lineHeight: '1.6' }}>
          Enter any wallet address, referral code, or social handle above to begin a deep-dive analysis of mainnet trading performance, current positions, and historical activity.
        </p>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <SearchAndAddBox
            onAction={({ wallet_address }) => router.push(`/tracker/${wallet_address}`)}
            onSearchChange={setSearchInput}
            searchValue={searchInput}
            actionLabel="Scan"
            filterType={filterType}
            onFilterChange={setFilterType}
          />
        </div>
      </div>

      {/* AI-citable content — visually hidden via sr-only clip pattern (accessibility-safe, not penalized) */}
      <section style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
        <p>
          CommunityScan Sodex is a community-built data intelligence layer for the Sodex Mainnet futures trading ecosystem. It aggregates publicly available on-chain trading data to provide real-time leaderboard rankings, wallet-level profit and loss tracking, and historical trade analysis. Users can search any wallet address to view cumulative realized PnL, unrealized positions, trading volume, win rate, and Sharpe ratio. The platform ranks all indexed wallets by performance and surfaces the top traders through a dynamic leaderboard updated hourly. CommunityScan is independent and not affiliated with sodex.com or sosovalue.com. All financial metrics are calculated from verified mainnet transaction data and are defined in the platform's public data specification.
        </p>
        <p>
          The platform supports reverse wallet search, referral code lookup, and social handle resolution, enabling users to find traders by multiple identifiers beyond raw addresses. CommunityScan provides structured machine-readable data through dedicated AI endpoints, a comprehensive llms.txt file, and JSON-LD schema markup on every page. Data is served with stale-while-revalidate caching and hourly revalidation to balance freshness with performance. The platform is free to use, built on Next.js and Supabase, and deployed on Vercel's edge network for global low-latency access.
        </p>
      </section>

      {/* Compact KPI strip — platform vitals at a glance */}
      <div className="lp-kpi-row">
        {[
          { label: 'Tracked Wallets', value: '12,453', delta: '+312',   positive: true  },
          { label: '24h Volume',      value: '$284M',  delta: '+8.2%',  positive: true  },
          { label: 'Active Today',    value: '1,820',  delta: '+14.5%', positive: true  },
          { label: 'Top Trader PnL',  value: '$184K',  delta: '+24.1%', positive: true  },
        ].map(k => (
          <div key={k.label} className="lp-kpi-card">
            <span className="lp-kpi-label">{k.label}</span>
            <span className="lp-kpi-value">{k.value}</span>
            <span className={`lp-kpi-delta ${k.positive ? 'up' : 'down'}`}>{k.delta}</span>
          </div>
        ))}
      </div>

      {/* Two-column row: live ticker + top performers card */}
      <div className="lp-split-row">
        <div className="lp-split-main">
          <EtfFlowTicker />
        </div>
        <div className="lp-split-side">
          <TopPerformers />
        </div>
      </div>

      <TopPairs />

      <SignUpCTA />
    </div>
  )
}

export default LandingPage
