export const coursiaDesignTokens = {
  color: {
    light: {
      background: '#fff5e8',
      surface: '#ffffff',
      surfaceMuted: '#e7efe9',
      foreground: '#0f2d27',
      muted: '#5f6f67',
      border: '#d9ded8',
      primary: '#0f2d27',
      primaryContrast: '#ffffff',
      secondary: '#a6c1b1',
      success: '#22c55e',
      warning: '#fbbf24',
      danger: '#ff4454',
      information: '#3b82f6',
      neutral: '#94a3b8',
      accent: '#ff7a59',
      peach: '#fff5e8',
    },
    dark: {
      background: '#111827',
      surface: '#1f2937',
      surfaceMuted: '#0b1f1a',
      foreground: '#ffffff',
      muted: '#cbd5d1',
      border: '#2a4c44',
      primary: '#0b1f1a',
      primaryContrast: '#ffffff',
      secondary: '#2a4c44',
      success: '#22c55e',
      warning: '#fbbf24',
      danger: '#ff4454',
      information: '#60a5fa',
      neutral: '#64748b',
      accent: '#ff7a59',
      peach: '#ffcfa8',
    },
  },
  typography: {
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    displayFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    scale: {
      body: '1rem',
      lead: '1.125rem',
      title: '2.25rem',
    },
  },
  spacing: {
    page: '1.5rem',
    component: '1rem',
    section: '2.5rem',
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
  shadow: {
    sm: '0 8px 24px rgb(15 45 39 / 8%)',
    md: '0 18px 48px rgb(15 45 39 / 14%)',
    glass: '0 24px 70px rgb(15 45 39 / 16%)',
  },
  effects: {
    glassBlur: '18px',
  },
} as const

export type CoursiaThemeName = keyof typeof coursiaDesignTokens.color
