'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionContextProvider } from './lib/SessionContext'
import { ThemeProvider } from './lib/ThemeContext'
import { CmsEditProvider } from './lib/CmsEditContext'
import { supabase } from './lib/supabaseClient'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            retry: 2,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
        },
    },
})

export function Providers({ children }) {
    return (
        <SessionContextProvider supabaseClient={supabase}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <CmsEditProvider>
                        {children}
                    </CmsEditProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </SessionContextProvider>
    )
}
