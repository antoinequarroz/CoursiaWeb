import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('COUR-107 isolated and mandatory CI test execution', () => {
  const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
    scripts: Record<string, string>
  }
  const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/ci.yml'), 'utf8')
  const vitestConfig = readFileSync(resolve(process.cwd(), 'vitest.config.ts'), 'utf8')
  const setup = readFileSync(resolve(process.cwd(), 'tests/setup.ts'), 'utf8')

  it('runs stable checks as one CI contract', () => {
    expect(packageJson.scripts['ci:pr']).toBe('npm run ci:secrets && npm run typecheck && npm run lint && npm test && npm run build && npm run e2e')
    expect(workflow).toContain('npm test')
    expect(workflow).toContain('npm run build')
    expect(workflow).toContain('npm run e2e')
    expect(workflow).toContain('pull_request')
    expect(workflow).toContain('push')
  })

  it('uses an isolated test environment instead of real Supabase credentials', () => {
    expect(vitestConfig).toContain("environment: 'jsdom'")
    expect(vitestConfig).toContain('https://example.supabase.co')
    expect(vitestConfig).toContain('test-publishable-placeholder')
    expect(setup).toContain('window.localStorage.clear()')
    expect(setup).toContain("document.body.innerHTML = ''")
  })
})
