import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')

const requiredFiles = [
  '.env.production.example',
  '.env.preview.example',
  'docs/production-release-cour-112.md',
  'shared/release/production-readiness.ts',
  'server/routes/robots.txt.get.ts',
  'server/routes/sitemap.xml.get.ts',
  'nuxt.config.ts',
]

const requiredProductionEnv = [
  'NUXT_PUBLIC_SITE_URL',
  'NUXT_PUBLIC_SUPABASE_URL',
  'NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NUXT_SUPABASE_SERVICE_ROLE_KEY',
  'NUXT_SENTRY_ENVIRONMENT',
  'NUXT_SENTRY_RELEASE',
  'NUXT_SENTRY_SOURCEMAPS',
  'NUXT_PUBLIC_SENTRY_ENVIRONMENT',
  'NUXT_PUBLIC_SENTRY_RELEASE',
]

const checks = [
  {
    name: 'required release files exist',
    pass: () => requiredFiles.every((file) => existsSync(file)),
  },
  {
    name: 'production env example documents required variables',
    pass: () => {
      const env = read('.env.production.example')
      return requiredProductionEnv.every((key) => env.includes(`${key}=`))
    },
  },
  {
    name: 'preview env example documents required variables',
    pass: () => {
      const env = read('.env.preview.example')
      return requiredProductionEnv.every((key) => env.includes(`${key}=`))
    },
  },
  {
    name: 'robots and sitemap routes are versioned',
    pass: () => read('server/routes/robots.txt.get.ts').includes('Sitemap:')
      && read('server/routes/robots.txt.get.ts').includes('Disallow: /admin')
      && read('server/routes/sitemap.xml.get.ts').includes('buildCanonicalUrl'),
  },
  {
    name: 'security headers and prerender routes are configured',
    pass: () => {
      const config = read('nuxt.config.ts')
      return config.includes('securityHeaders')
        && config.includes('routeRules')
        && config.includes('prerender')
        && config.includes('compressPublicAssets')
    },
  },
  {
    name: 'release runbook covers production controls',
    pass: () => {
      const doc = read('docs/production-release-cour-112.md')
      return [
        'Domaine, HTTPS, variables et redirections',
        'robots.txt',
        'sitemap.xml',
        'Admin protégé',
        'Migrations Supabase',
        'Sauvegarde',
        'Rollback',
        'recette complète',
        'bug bloquant ou critique',
      ].every((phrase) => doc.includes(phrase))
    },
  },
]

const failed = checks.filter((check) => !check.pass()).map((check) => check.name)

if (failed.length > 0) {
  console.error('Production readiness checklist failed:')
  failed.forEach((name) => console.error(`- ${name}`))
  process.exit(1)
}

console.log('Production readiness checklist is versioned.')
