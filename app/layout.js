import './styles/index.css'
import './styles/App.css'
import Navbar from './components/Navbar'
import AnnouncementBar from './components/AnnouncementBar'
import StatusBar from './components/StatusBar'
import CommandPalette from './components/CommandPalette'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Providers } from './providers'

export const metadata = {
  title: 'CommunityScan Sodex | #1 Data Intelligence Layer',
  description: 'The premier data extraction and visualization layer for Sodex Mainnet trading activity. Track top wallets, analyze PnL, and discover leaderboards.',
  metadataBase: new URL('https://www.communityscan-sodex.com'),
  openGraph: {
    title: 'CommunityScan Sodex | Real-time Trading Intelligence',
    description: 'Track top wallets, analyze PnL, and discover leaderboards on Sodex Mainnet.',
    url: 'https://www.communityscan-sodex.com',
    siteName: 'CommunityScan Sodex',
    images: [
      {
        url: '/og-default.png', // We should ensure this exists or use a fallback
        width: 1200,
        height: 630,
        alt: 'CommunityScan Sodex Dashboard',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CommunityScan Sodex',
    description: 'The premier data extraction and visualization layer for Sodex Mainnet.',
    creator: '@sodex',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "CommunityScan Sodex",
            "url": "https://www.communityscan-sodex.com",
            "logo": "https://www.communityscan-sodex.com/logo.svg",
            "sameAs": [
              "https://twitter.com/sodex"
            ]
          })
        }} />
        <Providers>
          <Navbar />
          <AnnouncementBar />
          {children}
          <StatusBar />
          <CommandPalette />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
