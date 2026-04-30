'use client'

import React from 'react'
import { useSessionContext } from '../lib/SessionContext'

export default function SignUpCTA() {
    const { openAuthModal } = useSessionContext()

    const features = [
        {
            title: 'Leaderboards',
            description: 'Track volume and PnL leaderboards Live to spot top traders.',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
            )
        },
        {
            title: 'Deep Dive Analytics',
            description: 'Analyze trading history, PnL performance, and observed social info for any wallet.',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
            )
        },
        {
            title: 'Full Access',
            description: 'Unlock more Features like wallet address aliases, watchlists, and wallet groups.',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
            )
        }
    ]

    return (
        <div className="signup-cta-section">
            <div className="signup-cta-content">
                <h2 className="signup-cta-title">Unlock All Features</h2>
                <p className="signup-cta-subtitle" style={{ maxWidth: '800px' }}>
                    Unlock the full scanner, 350+ referral codes, social analytics, upcoming listing announcements & more by creating an account.
                </p>

                <div className="signup-cta-features">
                    {features.map((feature, index) => (
                        <div key={index} className="signup-cta-feature-card">
                            <div className="feature-icon">
                                {feature.icon}
                            </div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>
                        </div>
                    ))}
                </div>

                <button
                    className="signup-cta-button"
                    onClick={openAuthModal}
                >
                    Register Now
                </button>
            </div>
        </div>
    )
}
