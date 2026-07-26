import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isE2eAdminAuthBypassAllowed } from '#shared/security/admin-auth-bypass'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('COUR-109 security audit controls', () => {
  it('never allows the E2E admin auth bypass in production', () => {
    expect(
      isE2eAdminAuthBypassAllowed({
        NODE_ENV: 'production',
        NUXT_E2E_BYPASS_ADMIN_AUTH: 'true',
      }),
    ).toBe(false)

    expect(
      isE2eAdminAuthBypassAllowed({
        NODE_ENV: 'test',
        NUXT_E2E_BYPASS_ADMIN_AUTH: 'true',
      }),
    ).toBe(true)
  })

  it('keeps privileged Supabase keys server-only', () => {
    const browserClient = read('app/utils/supabase/browser.ts')
    const serverClient = read('server/utils/supabase/server.ts')
    const nuxtConfig = read('nuxt.config.ts')

    expect(browserClient).toContain('supabasePublishableKey')
    expect(browserClient).not.toContain('supabaseServiceRoleKey')
    expect(serverClient).toContain('createSupabaseServiceRoleClient')
    expect(serverClient).toContain('persistSession: false')
    expect(nuxtConfig).toContain('supabaseServiceRoleKey')
    expect(nuxtConfig).toContain('public:')
  })

  it('documents Supabase RLS Storage hardening and negative-test evidence', () => {
    const report = read('docs/security-audit-cour-109.md')

    expect(report).toContain('Migrations appliquées sur Supabase')
    expect(report).toContain('security_invoker')
    expect(report).toContain('public.rls_auto_enable')
    expect(report).toContain('bucket Storage `images`')
    expect(report).toContain('5242880')
    expect(report).toContain('npm audit --audit-level=critical')
    expect(report).toContain('E2E couvrent des refus')
  })

  it('configures baseline browser hardening headers', () => {
    const nuxtConfig = read('nuxt.config.ts')

    expect(nuxtConfig).toContain('X-Content-Type-Options')
    expect(nuxtConfig).toContain('X-Frame-Options')
    expect(nuxtConfig).toContain('Referrer-Policy')
    expect(nuxtConfig).toContain('Permissions-Policy')
  })
})
