import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { publicLegalContent } from '../shared/public-site/legal-content'

describe('COUR-93 legal privacy and support pages', () => {
  const legalHub = readFileSync(resolve(process.cwd(), 'app/pages/legal.vue'), 'utf8')
  const legalSlug = readFileSync(resolve(process.cwd(), 'app/pages/legal/[slug].vue'), 'utf8')
  const supportPage = readFileSync(resolve(process.cwd(), 'app/pages/support.vue'), 'utf8')
  const homepage = readFileSync(resolve(process.cwd(), 'app/pages/index.vue'), 'utf8')

  it('publishes CGU, privacy, cookies and contact information', () => {
    expect(publicLegalContent.documents.map((document) => document.slug)).toEqual([
      'cgu',
      'confidentialite',
      'cookies',
    ])
    expect(publicLegalContent.contactEmail).toContain('@')
    expect(legalHub).toContain('/legal/${document.slug}')
  })

  it('shows version, effective date and consistency references', () => {
    expect(publicLegalContent.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(publicLegalContent.effectiveDate).toBe('2026-07-25')
    expect(publicLegalContent.references).toContain('COUR-43')
    expect(publicLegalContent.references).toContain('COUR-44')
    expect(legalSlug).toContain('Traçabilité')
  })

  it('explains access, export and deletion requests', () => {
    expect(publicLegalContent.dataRights.join(' ')).toContain('Accès')
    expect(publicLegalContent.dataRights.join(' ')).toContain('Export')
    expect(publicLegalContent.dataRights.join(' ')).toContain('Suppression')
    expect(supportPage).toContain('Accès, export et suppression')
  })

  it('links legal documents from the public footer and app-facing support', () => {
    expect(homepage).toContain('/legal/cgu')
    expect(homepage).toContain('/legal/confidentialite')
    expect(homepage).toContain('/legal/cookies')
    expect(homepage).toContain('/support')
  })
})

