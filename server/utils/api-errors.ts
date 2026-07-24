import { createError } from 'h3'
import { ZodError } from 'zod'
import { createApiErrorBody, type ApiErrorCode } from '#shared/api/errors'

const statusByCode: Record<ApiErrorCode, number> = {
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  INVALID_REQUEST: 400,
  NOT_FOUND: 404,
  UPSTREAM_ERROR: 502,
}

export const throwApiError = (code: ApiErrorCode, message: string, details?: unknown): never => {
  throw createError({
    statusCode: statusByCode[code],
    statusMessage: message,
    data: createApiErrorBody(code, message, details),
  })
}

export const throwValidationError = (error: unknown): never => {
  if (error instanceof ZodError) {
    return throwApiError('INVALID_REQUEST', 'Requête invalide.', error.flatten())
  }

  return throwApiError('INVALID_REQUEST', 'Requête invalide.')
}
