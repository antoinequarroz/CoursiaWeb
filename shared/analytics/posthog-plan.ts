import { publicSeoContent } from '#shared/public-site/seo-content'

export type PublicAnalyticsEvent = (typeof publicSeoContent.posthogEvents)[number]

export const posthogAnalyticsPlan = {
  provider: 'PostHog',
  enabledByDefault: false,
  consentRequired: true,
  events: publicSeoContent.posthogEvents,
  payloadPolicy: {
    avoidPersonalData: true,
    allowedFields: ['route', 'source', 'plan', 'cta', 'timestamp'],
    forbiddenFields: ['email', 'name', 'message', 'freeText', 'allergyDetails'],
  },
} as const

export const canTrackPublicEvent = (consentGranted: boolean) => consentGranted

