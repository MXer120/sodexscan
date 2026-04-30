import './styles/index.css'
import './styles/App.css'
import { Inter } from 'next/font/google'
import AppSidebar from './components/AppSidebar'
import AnnouncementBar from './components/AnnouncementBar'
import PageController from './components/PageController'
import PageTransition from './components/PageTransition'
import { GlobalHeader } from './components/dashboard/global-header'
import CmsEditToggle from './components/CmsEditToggle'
import CommandPalette from './components/CommandPalette'
import AlertNotifier from './components/AlertNotifier'
import { SidebarProvider } from './components/ui/sidebar'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster } from 'sonner'
import { ThemeProvider } from './components/ThemeProvider'
import { Providers } from './providers'
import { headers } from 'next/headers'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata = {
  title: 'CommunityScan Sodex | #1 Data Intelligence Layer',
  description: 'The premier data extraction and visualization layer for Sodex Mainnet trading activity. Track top wallets, analyze PnL, and discover leaderboards.',
  metadataBase: new URL('https://www.communityscan-sodex.com'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'CommunityScan Sodex | Real-time Trading Intelligence',
    description: 'Track top wallets, analyze PnL, and discover leaderboards on Sodex Mainnet.',
    url: 'https://www.communityscan-sodex.com',
    siteName: 'CommunityScan Sodex',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'CommunityScan Sodex' }],
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
        <head><link rel="icon" href="/favicon-orange.svg" type="image/svg+xml" /></head>
        <body>{children}</body>
      </html>
    )
  }

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon-orange.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased bg-[#f3f3f3] dark:bg-background">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <Providers>
            <SidebarProvider defaultOpen={true} className="bg-sidebar">
              <AppSidebar />
              <div className="h-dvh overflow-hidden lg:p-2 w-full">
                <div className="lg:border lg:rounded-md overflow-hidden flex flex-col bg-background h-full w-full min-h-0">
                  <GlobalHeader />
                  <PageTransition>
                    <main className="flex-1 overflow-auto w-full">
                      <AnnouncementBar />
                      <PageController />
                      <CmsEditToggle />
                      {children}
                    </main>
                  </PageTransition>
                </div>
              </div>
              <CommandPalette />
              <AlertNotifier />
            </SidebarProvider>
          </Providers>
        </ThemeProvider>
        <Toaster position="top-right" theme="dark" richColors />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
