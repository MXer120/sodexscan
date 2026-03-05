'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { ThemeSettings, DEFAULT_THEME, applyTheme, getThemeLogo, ColorScheme, ThemeMode, COLOR_SCHEMES } from './themes'
import { useSessionContext } from './SessionContext'
import { supabase } from './supabaseClient'

interface ThemeContextValue {
  theme: ThemeSettings
  setTheme: (settings: Partial<ThemeSettings>) => void
  logo: string
  isLoading: boolean
  autoSyncColors: boolean
  setAutoSyncColors: (val: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Validate colorScheme — migrates removed schemes (e.g. 'modern') to 'cyan'
function sanitizeColorScheme(scheme: string): ColorScheme {
  if (scheme in COLOR_SCHEMES) return scheme as ColorScheme
  return 'cli'
}

function getInitialTheme(): ThemeSettings {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const cached = localStorage.getItem('theme')
    if (cached) {
      const parsed = JSON.parse(cached) as ThemeSettings
      parsed.colorScheme = sanitizeColorScheme(parsed.colorScheme)
      return parsed
    }
  } catch {}
  return DEFAULT_THEME
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSessionContext()
  const [theme, setThemeState] = useState<ThemeSettings>(getInitialTheme)
  const [isLoading, setIsLoading] = useState(true)
  const [autoSyncColors, setAutoSyncColorsState] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('autoSyncColors') === 'true'
  })

  // Load theme from profile on mount / user change
  useEffect(() => {
    async function loadTheme() {
      setIsLoading(true)

      // localStorage is the primary source of truth (instant, always fresh)
      const cached = localStorage.getItem('theme')
      let hasLocalTheme = false
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as ThemeSettings
          parsed.colorScheme = sanitizeColorScheme(parsed.colorScheme)
          setThemeState(parsed)
          applyTheme(parsed)
          hasLocalTheme = true
        } catch (e) {
          // Invalid cache, fall through to DB
        }
      }

      // DB is only used as fallback when localStorage is empty (new device/browser)
      if (user && !hasLocalTheme) {
        const { data, error } = await supabase
          .from('profiles')
          .select('color_scheme, theme_mode, bullish_color, bearish_color, accent_color, auto_sync_colors')
          .eq('id', user.id)
          .single()

        if (data && !error) {
          const dbTheme: ThemeSettings = {
            colorScheme: sanitizeColorScheme(data.color_scheme || DEFAULT_THEME.colorScheme),
            mode: (data.theme_mode as ThemeMode) || DEFAULT_THEME.mode,
            bullishColor: data.bullish_color || DEFAULT_THEME.bullishColor,
            bearishColor: data.bearish_color || DEFAULT_THEME.bearishColor,
            accentColor: data.accent_color || DEFAULT_THEME.accentColor
          }
          setThemeState(dbTheme)
          applyTheme(dbTheme)
          localStorage.setItem('theme', JSON.stringify(dbTheme))
          if (data.auto_sync_colors != null) {
            setAutoSyncColorsState(data.auto_sync_colors)
            localStorage.setItem('autoSyncColors', String(data.auto_sync_colors))
          }
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
    if (JSON.stringify(newTheme) === JSON.stringify(theme)) return
    setThemeState(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme', JSON.stringify(newTheme))
    if (user) {
      await supabase.from('profiles').update({
        color_scheme: newTheme.colorScheme,
        theme_mode: newTheme.mode,
        bullish_color: newTheme.bullishColor,
        bearish_color: newTheme.bearishColor,
        accent_color: newTheme.accentColor,
        auto_sync_colors: autoSyncColors,
      }).eq('id', user.id)
    }
  }

  const setAutoSyncColors = async (val: boolean) => {
    setAutoSyncColorsState(val)
    localStorage.setItem('autoSyncColors', String(val))
    if (user) {
      await supabase.from('profiles').update({ auto_sync_colors: val }).eq('id', user.id)
    }
  }

  const logo = getThemeLogo(theme.colorScheme)

  return (
    <ThemeContext.Provider value={{ theme, setTheme, logo, isLoading, autoSyncColors, setAutoSyncColors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
