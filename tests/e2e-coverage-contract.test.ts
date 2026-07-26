import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('COUR-108 E2E browser coverage contract', () => {
  const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
    scripts: Record<string, string>
    devDependencies: Record<string, string>
  }
  const playwrightConfig = readFileSync(resolve(process.cwd(), 'playwright.config.ts'), 'utf8')
  const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/ci.yml'), 'utf8')
  const publicSpec = readFileSync(resolve(process.cwd(), 'e2e/public-flows.spec.ts'), 'utf8')
  const adminSpec = readFileSync(resolve(process.cwd(), 'e2e/admin-flows.spec.ts'), 'utf8')
  const fixtures = readFileSync(resolve(process.cwd(), 'e2e/fixtures.ts'), 'utf8')

  it('runs E2E through Playwright in a real browser', () => {
    expect(packageJson.devDependencies['@playwright/test']).toBeTruthy()
    expect(packageJson.scripts.e2e).toBe('playwright test')
    expect(playwrightConfig).toContain("name: 'chromium'")
    expect(playwrightConfig).toContain("trace: 'retain-on-failure'")
  })

  it('covers public navigation contact and waitlist', () => {
    expect(publicSpec).toContain("page.goto('/')")
    expect(publicSpec).toContain('/contact')
    expect(publicSpec).toContain('/liste-attente')
    expect(publicSpec).toContain('mockPublicEngagementApis')
  })

  it('covers admin login roles recipe publication and CSV error handling', () => {
    expect(adminSpec).toContain('/auth/login?redirect=/admin')
    expect(adminSpec).toContain('R.*le courant.*administrator')
    expect(adminSpec).toContain('/admin/recettes/publication')
    expect(adminSpec).toContain('Publier avec droits')
    expect(adminSpec).toContain('/admin/recettes/import')
    expect(adminSpec).toContain('Erreurs : 1')
  })

  it('does not depend on production data and exposes CI evidence', () => {
    expect(publicSpec).toContain('e2e@example.com')
    expect(fixtures).toContain('Fixture E2E')
    expect(playwrightConfig).toContain('https://example.supabase.co')
    expect(playwrightConfig).toContain('NUXT_E2E_BYPASS_ADMIN_AUTH')
    expect(playwrightConfig).toContain('playwright-report')
    expect(fixtures).toContain('/api/auth/session')
    expect(workflow).toContain('npm run e2e')
    expect(workflow).toContain('playwright-report')
  })
})
