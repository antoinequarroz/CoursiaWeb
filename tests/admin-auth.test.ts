import { describe, expect, it } from 'vitest'
import { buildAdminLoginRedirect, isAdminRoute } from '#shared/auth/admin-route'
import { sanitizeAdminRedirect } from '#shared/auth/redirect'
import { adminLoginSchema } from '#shared/validation/auth'

describe('admin auth routing', () => {
  it('detects protected admin routes for SSR and refresh protection', () => {
    expect(isAdminRoute('/admin')).toBe(true)
    expect(isAdminRoute('/admin/users')).toBe(true)
    expect(isAdminRoute('/auth/login')).toBe(false)
    expect(isAdminRoute('/administrator')).toBe(false)
  })

  it('builds a safe login redirect for unauthenticated admin access', () => {
    expect(buildAdminLoginRedirect('/admin?tab=users')).toBe(
      '/auth/login?redirect=%2Fadmin%3Ftab%3Dusers',
    )
  })

  it('rejects external return URLs after login', () => {
    expect(sanitizeAdminRedirect('https://example.com/admin')).toBe('/admin')
    expect(sanitizeAdminRedirect('//example.com/admin')).toBe('/admin')
    expect(sanitizeAdminRedirect('/public')).toBe('/admin')
  })

  it('validates admin login input without leaking auth details', () => {
    const result = adminLoginSchema.safeParse({
      email: 'admin@coursia.local',
      password: 'password-123',
      redirect: '/admin',
    })

    expect(result.success).toBe(true)
  })
})
