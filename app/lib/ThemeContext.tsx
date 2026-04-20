'use client'

import React, { createContext, useContext } from 'react'

// Fixed design system values — no runtime switching
const DS_THEME = {
  colorScheme: 'orange' as const,
  mode: 'dark' as const,
  bullishColor: '#22c55e',
  bearishColor: '#ef4444',
  accentColor: '#f26b1f',
}

interface ThemeContextValue {
  theme: typeof DS_THEME
  logo: string
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DS_THEME,
  logo: '/logo.svg',
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: DS_THEME, logo: '/logo.svg' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
