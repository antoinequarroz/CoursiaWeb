import { sanitizeAdminRedirect } from '#shared/auth/redirect'

export const isAdminRoute = (path: string) => {
  return path === '/admin' || path.startsWith('/admin/')
}

export const buildAdminLoginRedirect = (redirect: unknown) => {
  return `/auth/login?redirect=${encodeURIComponent(sanitizeAdminRedirect(redirect))}`
}
