import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { productionReadiness } from '#shared/release/production-readiness'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('COUR-112 production deployment validation', () => {
  it('versions the production readiness gate for the release ticket', () => {
    expect(productionReadiness.ticket).toBe('COUR-112')
    expect(productionReadiness.requiredEnvironmentVariables).toContain('NUXT_PUBLIC_SITE_URL')
    expect(productionReadiness.requiredEnvironmentVariables).toContain(
      'NUXT_SUPABASE_SERVICE_ROLE_KEY',
    )
    expect(productionReadiness.publicValidationRoutes).toContain('/robots.txt')
    expect(productionReadiness.publicValidationRoutes).toContain('/sitemap.xml')
    expect(productionReadiness.adminValidationChecks.join(' ')).toContain('/admin')
    expect(productionReadiness.supabaseMigrationChecks.join(' ')).toContain('supabase migration list')
    expect(productionReadiness.rollbackChecks.join(' ')).toContain('dernier commit stable')
  })

  it('documents production environment, observability and server-only secrets', () => {
    const productionEnv = read('.env.production.example')
    const previewEnv = read('.env.preview.example')

    for (const key of productionReadiness.requiredEnvironmentVariables) {
      expect(productionEnv).toContain(`${key}=`)
      expect(previewEnv).toContain(`${key}=`)
    }

    expect(productionEnv).toContain('Must be HTTPS')
    expect(productionEnv).toContain('Server-only')
    expect(productionEnv).toContain('NUXT_SENTRY_ENVIRONMENT=production')
    expect(previewEnv).toContain('NUXT_SENTRY_ENVIRONMENT=preview')
  })

  it('documents the deploy validation, Supabase migration gate and rollback plan', () => {
    const runbook = read('docs/production-release-cour-112.md')

    expect(runbook).toContain('Domaine, HTTPS, variables et redirections')
    expect(runbook).toContain('robots.txt')
    expect(runbook).toContain('sitemap.xml')
    expect(runbook).toContain('Admin protégé')
    expect(runbook).toContain('Migrations Supabase')
    expect(runbook).toContain('Sauvegarde')
    expect(runbook).toContain('Rollback')
    expect(runbook).toContain('recette complète')
    expect(runbook).toContain('bug bloquant ou critique')
  })

  it('keeps release validation automated and part of environment documentation', () => {
    const packageJson = read('package.json')
    const script = read('scripts/check-production-readiness.mjs')
    const environmentsDoc = read('docs/web-environments.md')

    expect(packageJson).toContain('"release:check"')
    expect(script).toContain('Production readiness checklist is versioned.')
    expect(environmentsDoc).toContain('npm run release:check')
    expect(environmentsDoc).toContain('docs/production-release-cour-112.md')
  })
})
