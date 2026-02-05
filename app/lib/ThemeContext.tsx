'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { ThemeSettings, DEFAULT_THEME, applyTheme, getThemeLogo, ColorScheme, ThemeMode } from './themes'
import { useSessionContext } from './SessionContext'
import { supabase } from './supabaseClient'

interface ThemeContextValue {
  theme: ThemeSettings
  setTheme: (settings: Partial<ThemeSettings>) => void
  logo: string
  isLoading: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSessionContext()
  const [theme, setThemeState] = useState<ThemeSettings>(DEFAULT_THEME)
  const [isLoading, setIsLoading] = useState(true)

  // Track if we should sync to DB (to avoid redundant updates on load)
  const shouldSyncRef = React.useRef(false)

  // Load theme from profile on mount / user change
  useEffect(() => {
    async function loadTheme() {
      setIsLoading(true)
      shouldSyncRef.current = false // Reset sync flag on user change

      // Try localStorage first for instant load
      const cached = localStorage.getItem('theme')
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as ThemeSettings
          setThemeState(parsed)
          applyTheme(parsed)
        } catch (e) {
          // Invalid cache, use default
        }
      }

      // If logged in, fetch from DB
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('color_scheme, theme_mode, bullish_color, bearish_color, accent_color')
          .eq('id', user.id)
          .single()

        if (data && !error) {
          const dbTheme: ThemeSettings = {
            colorScheme: (data.color_scheme as ColorScheme) || DEFAULT_THEME.colorScheme,
            mode: (data.theme_mode as ThemeMode) || DEFAULT_THEME.mode,
            bullishColor: data.bullish_color || DEFAULT_THEME.bullishColor,
            bearishColor: data.bearish_color || DEFAULT_THEME.bearishColor,
            accentColor: data.accent_color || DEFAULT_THEME.accentColor
          }
          setThemeState(dbTheme)
          applyTheme(dbTheme)
          localStorage.setItem('theme', JSON.stringify(dbTheme))
        }
      }

      setIsLoading(false)
      // After load, allow syncing
      setTimeout(() => {
        shouldSyncRef.current = true
      }, 500)
    }

    loadTheme()
  }, [user])

  // Apply theme on initial render (SSR safe)
  useEffect(() => {
    applyTheme(theme)
  }, [])

  // Debounced effect to save theme to DB
  useEffect(() => {
    if (!user || !shouldSyncRef.current || isLoading) return

    const timer = setTimeout(async () => {
      console.log('Syncing theme to database...')
      await supabase
        .from('profiles')
        .update({
          color_scheme: theme.colorScheme,
          theme_mode: theme.mode,
          bullish_color: theme.bullishColor,
          bearish_color: theme.bearishColor,
          accent_color: theme.accentColor
        })
        .eq('id', user.id)
    }, 2000) // 2 second debounce for color pickers

    return () => clearTimeout(timer)
  }, [theme, user, isLoading])

  const setTheme = (updates: Partial<ThemeSettings>) => {
    const newTheme = { ...theme, ...updates }

    // Check if anything actually changed
    if (JSON.stringify(newTheme) === JSON.stringify(theme)) return

    setThemeState(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme', JSON.stringify(newTheme))
    shouldSyncRef.current = true
  }

  const logo = getThemeLogo(theme.colorScheme)

  return (
    <ThemeContext.Provider value={{ theme, setTheme, logo, isLoading }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
