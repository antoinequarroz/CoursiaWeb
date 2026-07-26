import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildRecipeCsvIdempotencyKey,
  parseRecipeCsv,
  recipeCsvColumns,
  recipeCsvTemplate,
  summarizeRecipeCsvImport,
  validateRecipeCsvRows,
} from '../shared/validation/recipe-import'

describe('COUR-100 recipe CSV import with preview', () => {
  const importPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/recettes/import.vue'), 'utf8')
  const importRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/import/index.post.ts'),
    'utf8',
  )
  const templateRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/import/template.get.ts'),
    'utf8',
  )

  it('provides a downloadable CSV template', () => {
    expect(recipeCsvTemplate).toContain(recipeCsvColumns.join(','))
    expect(templateRoute).toContain('content-disposition')
    expect(importPage).toContain('Télécharger le modèle CSV')
  })

  it('dry-run reports creations updates duplicates and errors', () => {
    const rows = validateRecipeCsvRows(
      parseRecipeCsv(
        [
          recipeCsvColumns.join(','),
          'new-recipe,New Recipe,draft,4,20,easy,Famille,Interne',
          'existing,Existing,draft,4,20,easy,Famille,Interne',
          'existing,Duplicate,draft,4,20,easy,Famille,Interne',
          'bad slug,Bad,draft,4,20,easy,Famille,Interne',
        ].join('\n'),
      ),
      new Set(['existing']),
    )
    const report = summarizeRecipeCsvImport(rows, 'abc'.repeat(12), true)

    expect(report.creates).toBe(1)
    expect(report.updates).toBe(1)
    expect(report.duplicates).toBe(1)
    expect(report.errors).toBe(1)
  })

  it('associates errors with row numbers and fields', () => {
    const rows = validateRecipeCsvRows(
      parseRecipeCsv(`${recipeCsvColumns.join(',')}\nbad slug,Bad,draft,4,20,easy,Famille,Interne`),
      new Set(),
    )

    expect(rows[0]?.rowNumber).toBe(2)
    expect(rows[0]?.action).toBe('error')
    expect(rows[0]?.field).toBeTruthy()
  })

  it('prevents silent partial imports', () => {
    expect(importRoute).toContain('Import refusé')
    expect(importRoute).toContain('report.errors > 0 || report.duplicates > 0')
  })

  it('keeps reruns idempotent and conserves an import report', () => {
    expect(buildRecipeCsvIdempotencyKey(recipeCsvTemplate)).toHaveLength(64)
    expect(importRoute).toContain('idempotency_key')
    expect(importRoute).toContain('idempotentReplay')
    expect(importRoute).toContain('recipe_import_reports')
    expect(importPage).toContain('Rapport d’import')
  })

  it('stays coherent with the controlled COUR-17 pipeline', () => {
    expect(importRoute).toContain('official_recipes')
    expect(importRoute).toContain('writeAdminAuditLog')
    expect(importPage).toContain('Dry-run')
  })
})

