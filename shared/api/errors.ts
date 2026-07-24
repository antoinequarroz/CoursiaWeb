export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'UPSTREAM_ERROR'

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode
    message: string
    details?: unknown
  }
}

export const createApiErrorBody = (
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiErrorBody => ({
  error: {
    code,
    message,
    ...(details === undefined ? {} : { details }),
  },
})
