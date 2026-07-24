const defaultAdminRedirect = '/admin'

export const sanitizeAdminRedirect = (redirect: unknown) => {
  if (typeof redirect !== 'string' || redirect.length === 0) {
    return defaultAdminRedirect
  }

  if (!redirect.startsWith('/admin')) {
    return defaultAdminRedirect
  }

  if (redirect.startsWith('//') || redirect.includes('://')) {
    return defaultAdminRedirect
  }

  return redirect
}
