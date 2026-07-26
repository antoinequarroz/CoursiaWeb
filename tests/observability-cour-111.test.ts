import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { observabilityAlertRules, observabilityDataPolicy } from '#shared/observability/config'
import {
  sanitizeErrorMessage,
  sanitizeObservabilityPayload,
} from '#shared/observability/redaction'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('COUR-111 observability sentry logs and alerts', () => {
  it('separates environments releases and source maps', () => {
    const nuxtConfig = read('nuxt.config.ts')
    const envExample = read('.env.example')

    expect(nuxtConfig).toContain('sentryEnvironment')
    expect(nuxtConfig).toContain('sentryRelease')
    expect(nuxtConfig).toContain('sentrySourceMaps')
    expect(nuxtConfig).toContain('sourcemap')
    expect(envExample).toContain('NUXT_SENTRY_SOURCEMAPS=false')
  })

  it('filters PII secrets and unpublished recipe content before logging', () => {
    expect(
      sanitizeObservabilityPayload({
        email: 'parent@example.com',
        token: 'secret',
        recipeDraft: 'private recipe',
        publicRoute: '/tarifs',
      }),
    ).toEqual({
      email: '[Filtered]',
      token: '[Filtered]',
      recipeDraft: '[Filtered]',
      publicRoute: '/tarifs',
    })

    expect(sanitizeErrorMessage('Bearer abc.def.ghi for user parent@example.com')).toBe(
      'Bearer [Filtered] for user [FilteredEmail]',
    )
  })

  it('captures useful client and server errors with request correlation', () => {
    const clientPlugin = read('app/plugins/observability.client.ts')
    const clientRoute = read('server/api/observability/client-error.post.ts')
    const serverPlugin = read('server/plugins/observability.ts')
    const requestMiddleware = read('server/middleware/request-observability.ts')

    expect(clientPlugin).toContain('errorHandler')
    expect(clientPlugin).toContain('/api/observability/client-error')
    expect(clientRoute).toContain('clientErrorSchema')
    expect(clientRoute).toContain('captureObservabilityEvent')
    expect(serverPlugin).toContain("hooks.hook('error'")
    expect(requestMiddleware).toContain('x-request-id')
  })

  it('defines alert rules and allowed observability tags', () => {
    expect(observabilityAlertRules.map((rule) => rule.name)).toContain('Critical server errors')
    expect(observabilityAlertRules.some((rule) => rule.severity === 'critical')).toBe(true)
    expect(observabilityDataPolicy.allowedTags).toContain('requestId')
    expect(observabilityDataPolicy.filteredFields).toContain('serviceRole')
  })

  it('documents the test incident and current Sentry SDK integration status', () => {
    const report = read('docs/observability-cour-111.md')

    expect(report).toContain('@sentry/nuxt')
    expect(report).toContain('Incident de test')
    expect(report).toContain('DSN absent')
    expect(report).toContain('requestId')
  })
})
