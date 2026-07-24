import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('public site editorial structure', () => {
  const document = readFileSync(resolve(process.cwd(), 'docs/public-site-structure.md'), 'utf8')
  const homepage = readFileSync(resolve(process.cwd(), 'app/pages/index.vue'), 'utf8')

  it('identifies the required public audiences and CTAs', () => {
    expect(document).toContain('Utilisateurs')
    expect(document).toContain('Partenaires')
    expect(document).toContain('Investisseurs')
    expect(document).toContain('Rejoindre la liste d’attente')
    expect(document).toContain('Demander le dossier')
  })

  it('separates available features from roadmap items', () => {
    expect(document).toContain('Disponible maintenant')
    expect(document).toContain('Roadmap')
    expect(homepage).toContain('fonctionnalités disponibles')
    expect(homepage).toContain('roadmap')
  })

  it('documents desktop and mobile wireframes plus founder validation', () => {
    expect(document).toContain('Wireframe desktop')
    expect(document).toContain('Wireframe mobile')
    expect(document).toContain('Validation fondateurs')
  })
})
