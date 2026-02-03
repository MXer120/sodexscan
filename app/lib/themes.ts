// Theme System Configuration
// All color schemes are defined here - this is the single source of truth

export type ThemeMode = 'dark' | 'light'
export type ColorScheme = 'cyan' | 'orange' | 'purple' | 'green' | 'monochrome'

export interface ThemeSettings {
  colorScheme: ColorScheme
  mode: ThemeMode
  bullishColor: string
  bearishColor: string
  accentColor: string
}

export const DEFAULT_THEME: ThemeSettings = {
  colorScheme: 'cyan',
  mode: 'dark',
  bullishColor: '#22c55e',
  bearishColor: '#ef4444',
  accentColor: '#1230B7'
}

// Default bullish/bearish color presets
export const BULLISH_PRESETS = [
  '#22c55e', // Green (default)
  '#4ade80', // Light green
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
] as const

export const BEARISH_PRESETS = [
  '#ef4444', // Red (default)
  '#f87171', // Light red
  '#f97316', // Orange
  '#ec4899', // Pink
  '#8b5cf6', // Purple
] as const

export const ACCENT_PRESETS = ['#1230B7', '#00aaff', '#48cbff', '#667eea', '#f97316', '#a855f7', '#06b6d4', '#10b981']

// Color scheme definitions for each mode
export const COLOR_SCHEMES: Record<ColorScheme, {
  name: string
  dark: ThemeColors
  light: ThemeColors
  logo: string
}> = {
  cyan: {
    name: 'Cyan',
    logo: '/logo.svg',
    dark: {
      primary: '#48cbff',
      primaryDark: '#149cd2',
      primaryLight: '#7bd5ff',
      primaryRgb: '72, 203, 255',
      bgMain: '#0A0A0A',
      bgSecondary: '#0f0f0f',
      bgTertiary: '#141414',
      bgCard: 'rgba(20, 20, 20, 0.6)',
      bgModal: 'rgba(25, 25, 25, 0.98)',
      bgInput: 'rgba(30, 30, 30, 0.6)',
      textMain: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.6)',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      textDisabled: 'rgba(255, 255, 255, 0.3)',
      textSubtle: '#888888',
      textDark: '#666666',
      textDarker: '#444444',
      textLightGray: '#aaaaaa',
      textMediumGray: '#999999',
      borderSubtle: 'rgba(255, 255, 255, 0.1)',
      borderVisible: 'rgba(255, 255, 255, 0.2)',
      borderStrong: 'rgba(255, 255, 255, 0.3)',
      borderDark: '#333333',
      spot: '#31b3da',
      spotBg: 'rgba(49, 179, 218, 0.25)',
      volume: '#31b3da',
    },
    light: {
      primary: '#0891b2',
      primaryDark: '#0e7490',
      primaryLight: '#22d3ee',
      primaryRgb: '8, 145, 178',
      bgMain: '#f8fafc',
      bgSecondary: '#f1f5f9',
      bgTertiary: '#e2e8f0',
      bgCard: 'rgba(255, 255, 255, 0.8)',
      bgModal: 'rgba(255, 255, 255, 0.98)',
      bgInput: 'rgba(241, 245, 249, 0.8)',
      textMain: '#0f172a',
      textSecondary: 'rgba(15, 23, 42, 0.7)',
      textMuted: 'rgba(15, 23, 42, 0.5)',
      textDisabled: 'rgba(15, 23, 42, 0.3)',
      textSubtle: '#64748b',
      textDark: '#94a3b8',
      textDarker: '#cbd5e1',
      textLightGray: '#475569',
      textMediumGray: '#64748b',
      borderSubtle: 'rgba(15, 23, 42, 0.08)',
      borderVisible: 'rgba(15, 23, 42, 0.12)',
      borderStrong: 'rgba(15, 23, 42, 0.2)',
      borderDark: '#e2e8f0',
      spot: '#0891b2',
      spotBg: 'rgba(8, 145, 178, 0.15)',
      volume: '#0891b2',
    }
  },
  orange: {
    name: 'Orange',
    logo: '/logo-orange.svg',
    dark: {
      primary: '#f97316',
      primaryDark: '#ea580c',
      primaryLight: '#fb923c',
      primaryRgb: '249, 115, 22',
      bgMain: '#0A0A0A',
      bgSecondary: '#0f0f0f',
      bgTertiary: '#141414',
      bgCard: 'rgba(20, 20, 20, 0.6)',
      bgModal: 'rgba(25, 25, 25, 0.98)',
      bgInput: 'rgba(30, 30, 30, 0.6)',
      textMain: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.6)',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      textDisabled: 'rgba(255, 255, 255, 0.3)',
      textSubtle: '#888888',
      textDark: '#666666',
      textDarker: '#444444',
      textLightGray: '#aaaaaa',
      textMediumGray: '#999999',
      borderSubtle: 'rgba(255, 255, 255, 0.1)',
      borderVisible: 'rgba(255, 255, 255, 0.2)',
      borderStrong: 'rgba(255, 255, 255, 0.3)',
      borderDark: '#333333',
      spot: '#f97316',
      spotBg: 'rgba(249, 115, 22, 0.25)',
      volume: '#f97316',
    },
    light: {
      primary: '#ea580c',
      primaryDark: '#c2410c',
      primaryLight: '#fb923c',
      primaryRgb: '234, 88, 12',
      bgMain: '#fffbeb',
      bgSecondary: '#fef3c7',
      bgTertiary: '#fde68a',
      bgCard: 'rgba(255, 255, 255, 0.8)',
      bgModal: 'rgba(255, 255, 255, 0.98)',
      bgInput: 'rgba(254, 243, 199, 0.8)',
      textMain: '#1c1917',
      textSecondary: 'rgba(28, 25, 23, 0.7)',
      textMuted: 'rgba(28, 25, 23, 0.5)',
      textDisabled: 'rgba(28, 25, 23, 0.3)',
      textSubtle: '#78716c',
      textDark: '#a8a29e',
      textDarker: '#d6d3d1',
      textLightGray: '#57534e',
      textMediumGray: '#78716c',
      borderSubtle: 'rgba(28, 25, 23, 0.08)',
      borderVisible: 'rgba(28, 25, 23, 0.12)',
      borderStrong: 'rgba(28, 25, 23, 0.2)',
      borderDark: '#fde68a',
      spot: '#ea580c',
      spotBg: 'rgba(234, 88, 12, 0.15)',
      volume: '#ea580c',
    }
  },
  purple: {
    name: 'Purple',
    logo: '/logo-purple.svg',
    dark: {
      primary: '#a855f7',
      primaryDark: '#9333ea',
      primaryLight: '#c084fc',
      primaryRgb: '168, 85, 247',
      bgMain: '#0A0A0A',
      bgSecondary: '#0f0f0f',
      bgTertiary: '#141414',
      bgCard: 'rgba(20, 20, 20, 0.6)',
      bgModal: 'rgba(25, 25, 25, 0.98)',
      bgInput: 'rgba(30, 30, 30, 0.6)',
      textMain: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.6)',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      textDisabled: 'rgba(255, 255, 255, 0.3)',
      textSubtle: '#888888',
      textDark: '#666666',
      textDarker: '#444444',
      textLightGray: '#aaaaaa',
      textMediumGray: '#999999',
      borderSubtle: 'rgba(255, 255, 255, 0.1)',
      borderVisible: 'rgba(255, 255, 255, 0.2)',
      borderStrong: 'rgba(255, 255, 255, 0.3)',
      borderDark: '#333333',
      spot: '#a855f7',
      spotBg: 'rgba(168, 85, 247, 0.25)',
      volume: '#a855f7',
    },
    light: {
      primary: '#9333ea',
      primaryDark: '#7e22ce',
      primaryLight: '#c084fc',
      primaryRgb: '147, 51, 234',
      bgMain: '#faf5ff',
      bgSecondary: '#f3e8ff',
      bgTertiary: '#e9d5ff',
      bgCard: 'rgba(255, 255, 255, 0.8)',
      bgModal: 'rgba(255, 255, 255, 0.98)',
      bgInput: 'rgba(243, 232, 255, 0.8)',
      textMain: '#1e1b4b',
      textSecondary: 'rgba(30, 27, 75, 0.7)',
      textMuted: 'rgba(30, 27, 75, 0.5)',
      textDisabled: 'rgba(30, 27, 75, 0.3)',
      textSubtle: '#6b7280',
      textDark: '#9ca3af',
      textDarker: '#d1d5db',
      textLightGray: '#4b5563',
      textMediumGray: '#6b7280',
      borderSubtle: 'rgba(30, 27, 75, 0.08)',
      borderVisible: 'rgba(30, 27, 75, 0.12)',
      borderStrong: 'rgba(30, 27, 75, 0.2)',
      borderDark: '#e9d5ff',
      spot: '#9333ea',
      spotBg: 'rgba(147, 51, 234, 0.15)',
      volume: '#9333ea',
    }
  },
  green: {
    name: 'Green',
    logo: '/logo-green.svg',
    dark: {
      primary: '#22c55e',
      primaryDark: '#16a34a',
      primaryLight: '#4ade80',
      primaryRgb: '34, 197, 94',
      bgMain: '#0A0A0A',
      bgSecondary: '#0f0f0f',
      bgTertiary: '#141414',
      bgCard: 'rgba(20, 20, 20, 0.6)',
      bgModal: 'rgba(25, 25, 25, 0.98)',
      bgInput: 'rgba(30, 30, 30, 0.6)',
      textMain: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.6)',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      textDisabled: 'rgba(255, 255, 255, 0.3)',
      textSubtle: '#888888',
      textDark: '#666666',
      textDarker: '#444444',
      textLightGray: '#aaaaaa',
      textMediumGray: '#999999',
      borderSubtle: 'rgba(255, 255, 255, 0.1)',
      borderVisible: 'rgba(255, 255, 255, 0.2)',
      borderStrong: 'rgba(255, 255, 255, 0.3)',
      borderDark: '#333333',
      spot: '#22c55e',
      spotBg: 'rgba(34, 197, 94, 0.25)',
      volume: '#22c55e',
    },
    light: {
      primary: '#16a34a',
      primaryDark: '#15803d',
      primaryLight: '#4ade80',
      primaryRgb: '22, 163, 74',
      bgMain: '#f0fdf4',
      bgSecondary: '#dcfce7',
      bgTertiary: '#bbf7d0',
      bgCard: 'rgba(255, 255, 255, 0.8)',
      bgModal: 'rgba(255, 255, 255, 0.98)',
      bgInput: 'rgba(220, 252, 231, 0.8)',
      textMain: '#14532d',
      textSecondary: 'rgba(20, 83, 45, 0.7)',
      textMuted: 'rgba(20, 83, 45, 0.5)',
      textDisabled: 'rgba(20, 83, 45, 0.3)',
      textSubtle: '#4d7c0f',
      textDark: '#84cc16',
      textDarker: '#bef264',
      textLightGray: '#3f6212',
      textMediumGray: '#4d7c0f',
      borderSubtle: 'rgba(20, 83, 45, 0.08)',
      borderVisible: 'rgba(20, 83, 45, 0.12)',
      borderStrong: 'rgba(20, 83, 45, 0.2)',
      borderDark: '#bbf7d0',
      spot: '#16a34a',
      spotBg: 'rgba(22, 163, 74, 0.15)',
      volume: '#16a34a',
    }
  },
  monochrome: {
    name: 'Monochrome',
    logo: '/logo-mono.svg',
    dark: {
      primary: '#a1a1aa',
      primaryDark: '#71717a',
      primaryLight: '#d4d4d8',
      primaryRgb: '161, 161, 170',
      bgMain: '#09090b',
      bgSecondary: '#18181b',
      bgTertiary: '#27272a',
      bgCard: 'rgba(24, 24, 27, 0.6)',
      bgModal: 'rgba(24, 24, 27, 0.98)',
      bgInput: 'rgba(39, 39, 42, 0.6)',
      textMain: '#fafafa',
      textSecondary: 'rgba(250, 250, 250, 0.6)',
      textMuted: 'rgba(250, 250, 250, 0.4)',
      textDisabled: 'rgba(250, 250, 250, 0.3)',
      textSubtle: '#71717a',
      textDark: '#52525b',
      textDarker: '#3f3f46',
      textLightGray: '#a1a1aa',
      textMediumGray: '#71717a',
      borderSubtle: 'rgba(250, 250, 250, 0.1)',
      borderVisible: 'rgba(250, 250, 250, 0.2)',
      borderStrong: 'rgba(250, 250, 250, 0.3)',
      borderDark: '#3f3f46',
      spot: '#a1a1aa',
      spotBg: 'rgba(161, 161, 170, 0.25)',
      volume: '#a1a1aa',
    },
    light: {
      primary: '#52525b',
      primaryDark: '#3f3f46',
      primaryLight: '#71717a',
      primaryRgb: '82, 82, 91',
      bgMain: '#fafafa',
      bgSecondary: '#f4f4f5',
      bgTertiary: '#e4e4e7',
      bgCard: 'rgba(255, 255, 255, 0.8)',
      bgModal: 'rgba(255, 255, 255, 0.98)',
      bgInput: 'rgba(244, 244, 245, 0.8)',
      textMain: '#09090b',
      textSecondary: 'rgba(9, 9, 11, 0.7)',
      textMuted: 'rgba(9, 9, 11, 0.5)',
      textDisabled: 'rgba(9, 9, 11, 0.3)',
      textSubtle: '#71717a',
      textDark: '#a1a1aa',
      textDarker: '#d4d4d8',
      textLightGray: '#52525b',
      textMediumGray: '#71717a',
      borderSubtle: 'rgba(9, 9, 11, 0.08)',
      borderVisible: 'rgba(9, 9, 11, 0.12)',
      borderStrong: 'rgba(9, 9, 11, 0.2)',
      borderDark: '#e4e4e7',
      spot: '#52525b',
      spotBg: 'rgba(82, 82, 91, 0.15)',
      volume: '#52525b',
    }
  }
}

interface ThemeColors {
  primary: string
  primaryDark: string
  primaryLight: string
  primaryRgb: string
  bgMain: string
  bgSecondary: string
  bgTertiary: string
  bgCard: string
  bgModal: string
  bgInput: string
  textMain: string
  textSecondary: string
  textMuted: string
  textDisabled: string
  textSubtle: string
  textDark: string
  textDarker: string
  textLightGray: string
  textMediumGray: string
  borderSubtle: string
  borderVisible: string
  borderStrong: string
  borderDark: string
  spot: string
  spotBg: string
  volume: string
}

// Apply theme to document
export function applyTheme(settings: ThemeSettings) {
  if (typeof window === 'undefined') return

  const { colorScheme, mode, bullishColor, bearishColor, accentColor } = settings
  const colors = COLOR_SCHEMES[colorScheme][mode]
  const root = document.documentElement

  // Apply color scheme colors
  root.style.setProperty('--color-primary', colors.primary)
  root.style.setProperty('--color-primary-dark', colors.primaryDark)
  root.style.setProperty('--color-primary-light', colors.primaryLight)
  root.style.setProperty('--color-primary-rgb', colors.primaryRgb)

  root.style.setProperty('--color-bg-main', colors.bgMain)
  root.style.setProperty('--color-bg-secondary', colors.bgSecondary)
  root.style.setProperty('--color-bg-tertiary', colors.bgTertiary)
  root.style.setProperty('--color-bg-card', colors.bgCard)
  root.style.setProperty('--color-bg-modal', colors.bgModal)
  root.style.setProperty('--color-bg-input', colors.bgInput)

  root.style.setProperty('--color-text-main', colors.textMain)
  root.style.setProperty('--color-text-secondary', colors.textSecondary)
  root.style.setProperty('--color-text-muted', colors.textMuted)
  root.style.setProperty('--color-text-disabled', colors.textDisabled)
  root.style.setProperty('--color-text-subtle', colors.textSubtle)
  root.style.setProperty('--color-text-dark', colors.textDark)
  root.style.setProperty('--color-text-darker', colors.textDarker)
  root.style.setProperty('--color-text-light-gray', colors.textLightGray)
  root.style.setProperty('--color-text-medium-gray', colors.textMediumGray)

  root.style.setProperty('--color-border-subtle', colors.borderSubtle)
  root.style.setProperty('--color-border-visible', colors.borderVisible)
  root.style.setProperty('--color-border-strong', colors.borderStrong)
  root.style.setProperty('--color-border-dark', colors.borderDark)

  root.style.setProperty('--color-spot', colors.spot)
  root.style.setProperty('--color-spot-bg', colors.spotBg)
  root.style.setProperty('--color-volume', colors.volume)

  // Apply bullish/bearish colors
  root.style.setProperty('--color-success', bullishColor)
  root.style.setProperty('--color-success-rgb', hexToRgb(bullishColor))
  root.style.setProperty('--color-error', bearishColor)
  root.style.setProperty('--color-error-rgb', hexToRgb(bearishColor))

  // Apply accent color
  root.style.setProperty('--color-accent', accentColor)
  root.style.setProperty('--color-accent-rgb', hexToRgb(accentColor))

  // Update scrollbar for light mode
  if (mode === 'light') {
    root.style.setProperty('--scrollbar-thumb', 'rgba(0, 0, 0, 0.15)')
    root.style.setProperty('--scrollbar-thumb-hover', 'rgba(0, 0, 0, 0.25)')
  } else {
    root.style.setProperty('--scrollbar-thumb', 'rgba(255, 255, 255, 0.15)')
    root.style.setProperty('--scrollbar-thumb-hover', 'rgba(255, 255, 255, 0.25)')
  }

  // Set data attribute for CSS hooks
  root.setAttribute('data-theme', mode)
  root.setAttribute('data-color-scheme', colorScheme)
}

// Helper to convert hex to RGB string
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '34, 197, 94' // fallback
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
}

// Validate hex color
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}

// Get logo for current theme
export function getThemeLogo(colorScheme: ColorScheme): string {
  return COLOR_SCHEMES[colorScheme].logo
}
