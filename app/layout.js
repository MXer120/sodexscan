'use client'

import './styles/index.css'
import './styles/App.css'
import Navbar from './components/Navbar'
import StatusBar from './components/StatusBar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionContextProvider } from './lib/SessionContext'
import { supabase } from './lib/supabaseClient'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SessionContextProvider supabaseClient={supabase}>
          <QueryClientProvider client={queryClient}>
            <Navbar />
            {children}
            <StatusBar />
          </QueryClientProvider>
        </SessionContextProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
