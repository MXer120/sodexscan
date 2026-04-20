import './styles/index.css'
import './styles/App.css'
import Navbar from './components/Navbar'
import AnnouncementBar from './components/AnnouncementBar'
import PageController from './components/PageController'
import PageTransition from './components/PageTransition'
import CmsEditToggle from './components/CmsEditToggle'
import CommandPalette from './components/CommandPalette'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Providers } from './providers'
import { headers } from 'next/headers'

export const metadata = {
  title: 'CommunityScan Sodex | #1 Data Intelligence Layer',
  description: 'The premier data extraction and visualization layer for Sodex Mainnet trading activity. Track top wallets, analyze PnL, and discover leaderboards.',
  metadataBase: new URL('https://www.communityscan-sodex.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'CommunityScan Sodex | Real-time Trading Intelligence',
    description: 'Track top wallets, analyze PnL, and discover leaderboards on Sodex Mainnet.',
    url: 'https://www.communityscan-sodex.com',
    siteName: 'CommunityScan Sodex',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'CommunityScan Sodex — Real-time Trading Intelligence Dashboard',
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
    images: ['/opengraph-image'],
  },
}

export default async function RootLayout({ children }) {
  const isMaintenance = (await headers()).get('x-maintenance') === '1'

  if (isMaintenance) {
    return (
      <html lang="en">
        <head>
          <link rel="icon" href="/favicon-orange.svg" type="image/svg+xml" />
        </head>
        <body>{children}</body>
      </html>
    )
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" as="style" />
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet" media="print" onLoad="this.media='all'" />
        <link rel="icon" href="/favicon-orange.svg" type="image/svg+xml" />
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
              "https://twitter.com/sodex",
              "https://t.me/sodex"
            ]
          })
        }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "CommunityScan Sodex",
            "url": "https://www.communityscan-sodex.com",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://www.communityscan-sodex.com/tracker/{wallet_address}"
              },
              "query-input": "required name=wallet_address"
            }
          })
        }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "CommunityScan Sodex",
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Web",
            "url": "https://www.communityscan-sodex.com",
            "description": "Real-time data intelligence layer for Sodex Mainnet. Track wallet performance, analyze PnL rankings, and monitor trading activity across the Sodex futures ecosystem.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "featureList": [
              "Wallet performance tracking",
              "PnL leaderboard rankings",
              "Real-time position monitoring",
              "Historical trade analysis",
              "Reverse wallet search",
              "Referral code tracking"
            ]
          })
        }} />
        <Providers>
          <Navbar />
          <PageTransition>
            <main className="page-content">
              <AnnouncementBar />
              <PageController />
              <CmsEditToggle />
              {children}
            </main>
          </PageTransition>
          <CommandPalette />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
