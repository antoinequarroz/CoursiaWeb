export const webQualityBudgets = {
  publicPages: {
    lcpMs: 2500,
    cls: 0.1,
    inpMs: 200,
    javascriptKbGzip: 180,
  },
  adminPages: {
    maxInitialRows: 50,
    maxSearchResults: 50,
  },
  accessibility: {
    requiresSkipLinks: true,
    requiresVisibleFocus: true,
    requiresReducedMotion: true,
    requiresFormLabels: true,
  },
} as const
