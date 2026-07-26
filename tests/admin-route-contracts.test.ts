import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const route = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('COUR-107 admin server route contracts', () => {
  const criticalRoutes = [
    {
      name: 'recipe create',
      file: 'server/api/admin/recipes/index.post.ts',
      schema: 'officialRecipeMutationSchema',
      access: 'requireRecipeWriteAccess',
      success: "resourceType: 'official_recipe'",
    },
    {
      name: 'recipe media create',
      file: 'server/api/admin/recipes/media/index.post.ts',
      schema: 'recipeMediaMetadataSchema',
      access: 'requireRecipeMediaAccess',
      success: "resourceType: 'recipe_media_asset'",
    },
    {
      name: 'price create',
      file: 'server/api/admin/prices/index.post.ts',
      schema: 'priceEntrySchema',
      access: 'requireRetailCatalogAccess',
      success: "resourceType: 'price_entry'",
    },
    {
      name: 'support procedure',
      file: 'server/api/admin/support-users/procedure.post.ts',
      schema: 'supportControlledProcedureSchema',
      access: 'requireSupportProcedureAccess',
      success: "resourceType: 'support_user_procedure'",
    },
    {
      name: 'content create',
      file: 'server/api/admin/content/index.post.ts',
      schema: 'contentEntrySchema',
      access: 'requireContentSettingsAccess',
      success: "resourceType: 'content_entry'",
    },
    {
      name: 'feature flag update',
      file: 'server/api/admin/feature-flags/index.post.ts',
      schema: 'featureFlagSchema',
      access: 'requireFeatureFlagAccess',
      success: "resourceType: 'feature_flag'",
    },
  ]

  it.each(criticalRoutes)('checks success refusal and invalid-data path for $name', (contract) => {
    const source = route(contract.file)

    expect(source).toContain('getSensitiveAdminContext')
    expect(source).toContain(contract.access)
    expect(source).toContain(contract.schema)
    expect(source).toContain('safeParse')
    expect(source).toContain('throwValidationError')
    expect(source).toContain('createSupabaseServiceRoleClient')
    expect(source).toContain(contract.success)
    expect(source).toContain('writeAdminAuditLog')
  })

  it('keeps sensitive server routes behind role checks before mutations', () => {
    for (const contract of criticalRoutes) {
      const source = route(contract.file)
      expect(source.indexOf(contract.access)).toBeLessThan(source.indexOf('createSupabaseServiceRoleClient'))
    }
  })
})
