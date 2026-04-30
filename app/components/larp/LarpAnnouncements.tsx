'use client'

const ANNOUNCEMENTS = [
  'New Listing：Enabled Perps $SKHX,$ORCL,$TSM,$EWY,$COPPER-2026-03-19',
  'Link Mobile Device is now live on SoDEX',
  'SoDEX Mainnet Upgrade Completed -March 18, 2026',
]

export default function LarpAnnouncements() {
  return (
    <div className="larp-ann-sidebar">
      <h3 className="larp-ann-title">Announcement</h3>
      <ul className="larp-ann-list">
        {ANNOUNCEMENTS.map((text, i) => (
          <li key={i} className="larp-ann-item">
            <span className="larp-ann-dot" />
            <a href="#" className="larp-ann-link" onClick={(e) => e.preventDefault()}>
              {text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
