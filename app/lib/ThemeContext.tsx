'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyTheme,
  DEFAULT_THEME,
  loadStoredSettings,
  saveSettings,
  isValidHex,
  type ThemeSettings,
  type ThemeMode,
  type ColorScheme,
} from './themes'

interface ThemeContextValue {
  settings: ThemeSettings
  mode: ThemeMode
  colorScheme: ColorScheme
  /** Effective primary color (custom override if set, otherwise scheme primary). */
  primaryColor: string
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
  setColorScheme: (scheme: ColorScheme) => void
  setCustomPrimary: (hex: string | undefined) => void
  resetCustomPrimary: () => void
  setBullishColor: (hex: string) => void
  setBearishColor: (hex: string) => void
  setAccentColor: (hex: string) => void
}

const noop = () => {}

const ThemeContext = createContext<ThemeContextValue>({
  settings: DEFAULT_THEME,
  mode: DEFAULT_THEME.mode,
  colorScheme: DEFAULT_THEME.colorScheme,
  primaryColor: '#1230B7',
  setMode: noop,
  toggleMode: noop,
  setColorScheme: noop,
  setCustomPrimary: noop,
  resetCustomPrimary: noop,
  setBullishColor: noop,
  setBearishColor: noop,
  setAccentColor: noop,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_THEME)
  const hydrated = useRef(false)

  // Hydrate from localStorage and apply on first client render.
  useEffect(() => {
    const loaded = loadStoredSettings()
    setSettings(loaded)
    applyTheme(loaded)
    hydrated.current = true
  }, [])

  // Re-apply + persist on every settings change after hydration.
  useEffect(() => {
    if (!hydrated.current) return
    applyTheme(settings)
    saveSettings(settings)
  }, [settings])

  const update = useCallback((patch: Partial<ThemeSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
  }, [])

  const setMode = useCallback((mode: ThemeMode) => update({ mode }), [update])
  const toggleMode = useCallback(() => {
    setSettings(prev => ({ ...prev, mode: prev.mode === 'dark' ? 'light' : 'dark' }))
  }, [])
  const setColorScheme = useCallback((colorScheme: ColorScheme) => update({ colorScheme }), [update])
  const setCustomPrimary = useCallback((hex: string | undefined) => {
    update({ customPrimary: hex && isValidHex(hex) ? hex : undefined })
  }, [update])
  const resetCustomPrimary = useCallback(() => update({ customPrimary: undefined }), [update])
  const setBullishColor = useCallback((bullishColor: string) => update({ bullishColor }), [update])
  const setBearishColor = useCallback((bearishColor: string) => update({ bearishColor }), [update])
  const setAccentColor = useCallback((accentColor: string) => update({ accentColor }), [update])

  const primaryColor = useMemo(() => {
    if (settings.customPrimary && isValidHex(settings.customPrimary)) return settings.customPrimary
    // Effective primary is whatever applyTheme just wrote — read it back from CSS for display
    if (typeof window !== 'undefined') {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
      if (v) return v
    }
    return '#1230B7'
  }, [settings])

  const value: ThemeContextValue = {
    settings,
    mode: settings.mode,
    colorScheme: settings.colorScheme,
    primaryColor,
    setMode,
    toggleMode,
    setColorScheme,
    setCustomPrimary,
    resetCustomPrimary,
    setBullishColor,
    setBearishColor,
    setAccentColor,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
