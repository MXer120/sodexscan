// CSS Variable Helper - Access CSS variables in JavaScript
// This allows components to use the same theme colors defined in index.css

export const getCSSVariable = (variableName) => {
    if (typeof window === 'undefined') return ''
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()
}

// Pre-defined color constants that match CSS variables
// These can be used in inline styles and will update when CSS variables change
export const THEME_COLORS = {
    // Primary
    primary: 'var(--color-primary)',
    primaryDark: 'var(--color-primary-dark)',
    primaryLight: 'var(--color-primary-light)',

    // Backgrounds
    bgMain: 'var(--color-bg-main)',
    bgSecondary: 'var(--color-bg-secondary)',
    bgTertiary: 'var(--color-bg-tertiary)',
    bgCard: 'var(--color-bg-card)',
    bgModal: 'var(--color-bg-modal)',
    bgInput: 'var(--color-bg-input)',

    // Text
    textMain: 'var(--color-text-main)',
    textSecondary: 'var(--color-text-secondary)',
    textMuted: 'var(--color-text-muted)',
    textDisabled: 'var(--color-text-disabled)',
    textSubtle: 'var(--color-text-subtle)',
    textDark: 'var(--color-text-dark)',
    textDarker: 'var(--color-text-darker)',
    textLightGray: 'var(--color-text-light-gray)',
    textMediumGray: 'var(--color-text-medium-gray)',

    // Borders
    borderSubtle: 'var(--color-border-subtle)',
    borderVisible: 'var(--color-border-visible)',
    borderStrong: 'var(--color-border-strong)',
    borderDark: 'var(--color-border-dark)',

    // Status
    success: 'var(--color-success)',
    error: 'var(--color-error)',
    warning: 'var(--color-warning)',

    // Accents
    blue: 'var(--color-blue)',
    cyan: 'var(--color-cyan)',
    teal: 'var(--color-teal)',
    purple: 'var(--color-purple)',
    pink: 'var(--color-pink)',
    orange: 'var(--color-orange)',
    lime: 'var(--color-lime)',
    info: 'var(--color-info)',
    telegram: 'var(--color-telegram)',
    discord: 'var(--color-discord)',

    accent: 'var(--color-accent)',
    accentBg: 'rgba(var(--color-accent-rgb), 0.15)',

    // Feature specific
    spot: 'var(--color-spot)',
    spotBg: 'var(--color-spot-bg)',
    volume: 'var(--color-volume)',

    // Chart colors (array for convenience)
    chart: [
        'var(--color-chart-1)',
        'var(--color-chart-2)',
        'var(--color-chart-3)',
        'var(--color-chart-4)',
        'var(--color-chart-5)',
        'var(--color-chart-6)',
        'var(--color-chart-7)',
        'var(--color-chart-8)',
        'var(--color-chart-9)',
        'var(--color-chart-10)'
    ]
}

// For components that need actual hex values (e.g., recharts fills)
// These will be computed at runtime from CSS variables
export const getThemeHexColors = () => {
    const root = document.documentElement
    const getVar = (name) => getComputedStyle(root).getPropertyValue(name).trim()

    return {
        success: getVar('--color-success'),
        error: getVar('--color-error'),
        warning: getVar('--color-warning'),
        blue: getVar('--color-blue'),
        accent: getVar('--color-accent'),
        info: getVar('--color-info'),
        telegram: getVar('--color-telegram'),
        discord: getVar('--color-discord'),
        textMain: getVar('--color-text-main'),
        chart: [
            getVar('--color-chart-1'),
            getVar('--color-chart-2'),
            getVar('--color-chart-3'),
            getVar('--color-chart-4'),
            getVar('--color-chart-5'),
            getVar('--color-chart-6'),
            getVar('--color-chart-7'),
            getVar('--color-chart-8'),
            getVar('--color-chart-9'),
            getVar('--color-chart-10')
        ]
    }
}
