'use client'

import React from 'react'
import SocialStatsCharts from './SocialStatsCharts'
import '../styles/SocialPage.css'

export default function StatsPage() {
  return (
    <div className="social-page dashboard">
      <h1 className="dashboard-title">Social Stats</h1>
      <SocialStatsCharts />
    </div>
  )
}
