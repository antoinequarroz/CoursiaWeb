import type { H3Event } from 'h3'
import { sanitizeErrorMessage, sanitizeObservabilityPayload } from '#shared/observability/redaction'

type ObservabilityLevel = 'info' | 'warning' | 'error' | 'critical'

type ObservabilityEvent = {
  level: ObservabilityLevel
  source: 'client' | 'server'
  message: string
  route?: string | undefined
  action?: string | undefined
  component?: string | undefined
  requestId?: string | undefined
  errorName?: string
  payload?: unknown
}

export const getRequestId = (event: H3Event) => {
  return typeof event.context.requestId === 'string' ? event.context.requestId : undefined
}

export const captureObservabilityEvent = (input: ObservabilityEvent) => {
  const config = useRuntimeConfig()
  const payload = {
    level: input.level,
    source: input.source,
    message: sanitizeErrorMessage(input.message),
    environment: config.sentryEnvironment,
    release: config.sentryRelease || 'unknown',
    requestId: input.requestId,
    route: input.route,
    action: input.action,
    component: input.component,
    errorName: input.errorName,
    extra: sanitizeObservabilityPayload(input.payload),
    sentryConfigured: Boolean(config.sentryDsn),
  }

  const serialized = JSON.stringify(payload)

  if (input.level === 'critical' || input.level === 'error') {
    console.error(serialized)
    return
  }

  console.warn(serialized)
}

export const captureServerException = (event: H3Event, error: unknown, action?: string) => {
  const errorObject = error instanceof Error ? error : new Error(String(error))

  captureObservabilityEvent({
    level: 'error',
    source: 'server',
    message: errorObject.message,
    route: event.path,
    action,
    requestId: getRequestId(event),
    errorName: errorObject.name,
  })
}
