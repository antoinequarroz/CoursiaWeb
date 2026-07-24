export const coursiaDesignTokens = {
  color: {
    light: {
      background: '#f6f8fc',
      surface: '#ffffff',
      surfaceMuted: '#eef3fb',
      foreground: '#101828',
      muted: '#5f6f89',
      border: '#d8e2f0',
      primary: '#1746a2',
      primaryContrast: '#ffffff',
      secondary: '#36c2b4',
      success: '#11875d',
      warning: '#b7791f',
      danger: '#c2413f',
    },
    dark: {
      background: '#07111f',
      surface: '#0d1b2f',
      surfaceMuted: '#13243a',
      foreground: '#edf4ff',
      muted: '#a9b8cf',
      border: '#26415f',
      primary: '#80a7ff',
      primaryContrast: '#07111f',
      secondary: '#5eead4',
      success: '#58d68d',
      warning: '#f6c453',
      danger: '#ff8a80',
    },
  },
  typography: {
    fontFamily:
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
    sm: '0 1px 2px rgb(16 24 40 / 6%)',
    md: '0 12px 32px rgb(23 70 162 / 12%)',
    glass: '0 20px 50px rgb(16 24 40 / 14%)',
  },
  effects: {
    glassBlur: '18px',
  },
} as const

export type CoursiaThemeName = keyof typeof coursiaDesignTokens.color
