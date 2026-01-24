'use client'

import { useState } from 'react'
import '../styles/StatusBar.css'

export default function StatusBar() {
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  return (
    <>
      <div className="status-bar">
        <div className="status-bar-left">
          <a href="https://sodex.com" target="_blank" rel="noopener noreferrer" className="status-link">
            Sodex
          </a>
          <span className="status-divider-text">|</span>
          <button onClick={() => setShowDisclaimer(true)} className="status-link status-btn">
            Disclaimer
          </button>
        </div>
        <div className="status-bar-right">
          <div className="status-divider-vertical" />
          <a href="https://x.com/Lutz_S120" target="_blank" rel="noopener noreferrer" className="status-icon-link" aria-label="X (Twitter)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a href="https://t.me/LutzS120" target="_blank" rel="noopener noreferrer" className="status-icon-link" aria-label="Telegram">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>
        </div>
      </div>

      {showDisclaimer && (
        <div className="disclaimer-overlay" onClick={() => setShowDisclaimer(false)}>
          <div className="disclaimer-modal" onClick={(e) => e.stopPropagation()}>
            <button className="disclaimer-close" onClick={() => setShowDisclaimer(false)}>×</button>
            <h2>Disclaimer</h2>
            <div className="disclaimer-content">
              <p>
                The information provided on this platform is for informational purposes only and does not constitute financial, investment, or legal advice.
              </p>
              <p>
                Cryptocurrency and token trading involves substantial risk of loss and is not suitable for every investor. Past performance is not indicative of future results.
              </p>
              <p>
                Always conduct your own research and consult with a qualified financial advisor before making any investment decisions. We are not responsible for any losses incurred based on the information provided.
              </p>
              <p>
                By using this platform, you acknowledge and accept these terms.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
