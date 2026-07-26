const sensitiveKeyPattern =
  /(password|passcode|secret|token|api[_-]?key|service[_-]?role|authorization|cookie|email|phone|address|recipeDraft|draftRecipe|unpublishedRecipe)/i

export type SanitizedPayload =
  | null
  | string
  | number
  | boolean
  | SanitizedPayload[]
  | { [key: string]: SanitizedPayload }

export const redactSensitiveValue = (key: string, value: unknown): SanitizedPayload => {
  if (sensitiveKeyPattern.test(key)) {
    return '[Filtered]'
  }

  return sanitizeObservabilityPayload(value)
}

export const sanitizeObservabilityPayload = (value: unknown): SanitizedPayload => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeObservabilityPayload(item))
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, nestedValue]) => [key, redactSensitiveValue(key, nestedValue)]),
    )
  }

  return String(value)
}

export const sanitizeErrorMessage = (message: string) => {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [Filtered]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[FilteredEmail]')
}
