export const observabilityAlertRules = [
  {
    name: 'Critical server errors',
    condition: 'server_error_count >= 1 over 5 minutes',
    severity: 'critical',
  },
  {
    name: 'Admin forbidden spike',
    condition: 'admin_forbidden_count >= 5 over 10 minutes',
    severity: 'warning',
  },
  {
    name: 'Client error regression',
    condition: 'client_error_rate > 2% over 15 minutes',
    severity: 'warning',
  },
  {
    name: 'Observability ingestion missing',
    condition: 'no_event_seen over 24 hours in production',
    severity: 'warning',
  },
] as const

export const observabilityDataPolicy = {
  filteredFields: [
    'password',
    'secret',
    'token',
    'apiKey',
    'serviceRole',
    'authorization',
    'cookie',
    'email',
    'phone',
    'address',
    'recipeDraft',
    'unpublishedRecipe',
  ],
  allowedTags: ['environment', 'release', 'requestId', 'route', 'component', 'action'],
  sourceMapsSeparatedBy: ['environment', 'release'],
} as const
