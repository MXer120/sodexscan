'use client'

import React from 'react'
import TopPairs from './TopPairs'
import '../styles/MainnetPage.css'

function LandingPage() {
  return (
    <div className="landing-page" style={{ padding: '40px', paddingTop: '100px', maxWidth: '1600px', margin: '0 auto' }}>
      <TopPairs />
    </div>
  )
}

export default LandingPage
