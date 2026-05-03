'use client'
import { usePathname } from 'next/navigation'
import { DashboardHeader } from './header'

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/tracker': 'Scanner',
  '/mainnet': 'Leaderboard',
  '/sopoints': 'SoPoints',
  '/referral': 'Referral',
  '/watchlist': 'Watchlist',
  '/alerts': 'Alerts',
  '/copy': 'Copy Trade',
  '/workflow': 'Workflows',
  '/aggregator': 'Aggregator',
  '/reports': 'Reports',
  '/tools': 'Tools',
  '/platform': 'Platform',
  '/larp-detector': 'LARP Detector',
  '/reverse-search': 'Reverse Search',
  '/incoming': 'Incoming',
  '/design-system': 'Design System',
  '/roadmap': 'Roadmap',
  '/ai': 'CommunityScan AI',
  '/chat': 'CommunityScan AI',
  '/profile': 'Profile',
  '/admin': 'Admin',
}

export function GlobalHeader() {
  const pathname = usePathname()
  // Match exact first, then prefix
  let title = TITLES[pathname]
  if (!title) {
    for (const [path, name] of Object.entries(TITLES)) {
      if (path !== '/' && pathname.startsWith(path)) { title = name; break }
    }
  }
  if (!title) title = 'CommunityScan'

  // Only show layout editor on homepage
  const showLayoutEditor = pathname === '/'
  // Hide entirely on chat/ai (they have their own UI)
  if (pathname.startsWith('/chat') || pathname === '/ai') return null

  return <DashboardHeader title={title} showLayoutEditor={showLayoutEditor} />
}
