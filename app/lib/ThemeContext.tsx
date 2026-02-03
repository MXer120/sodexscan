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

  // Load theme from profile on mount / user change
  useEffect(() => {
    async function loadTheme() {
      setIsLoading(true)

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
    }

    loadTheme()
  }, [user])

  // Apply theme on initial render (SSR safe)
  useEffect(() => {
    applyTheme(theme)
  }, [])

  const setTheme = async (updates: Partial<ThemeSettings>) => {
    const newTheme = { ...theme, ...updates }
    setThemeState(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme', JSON.stringify(newTheme))

    // Save to DB if logged in
    if (user) {
      await supabase
        .from('profiles')
        .update({
          color_scheme: newTheme.colorScheme,
          theme_mode: newTheme.mode,
          bullish_color: newTheme.bullishColor,
          bearish_color: newTheme.bearishColor,
          accent_color: newTheme.accentColor
        })
        .eq('id', user.id)
    }
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
