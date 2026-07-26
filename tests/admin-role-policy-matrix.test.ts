import { describe, expect, it } from 'vitest'
import {
  adminRoles,
  canAccessAdminPermission,
  canManageAdminRole,
  hasAdminRole,
  type AdminRole,
} from '#shared/auth/permissions'
import {
  requireCommunityModerationDecisionAccess,
  requireCommunityModerationReadAccess,
} from '../server/utils/community-moderation'
import { requireContentSettingsAccess, requireFeatureFlagAccess } from '../server/utils/content-settings'
import { requireRecipeDeleteAccess, requireRecipeWriteAccess } from '../server/utils/admin-recipes'
import { requireRecipeMediaAccess } from '../server/utils/recipe-media'
import { requireRetailCatalogAccess } from '../server/utils/retail-catalog'
import { requireSupportProcedureAccess, requireSupportUserReadAccess } from '../server/utils/support-users'

const captureDecision = (fn: () => void) => {
  try {
    fn()
    return 'allowed'
  }
  catch {
    return 'denied'
  }
}

describe('COUR-107 roles and policy matrix with multiple accounts', () => {
  it('tests every role against core permission matrix', () => {
    const accounts: Array<{ id: string, role: AdminRole | null }> = [
      { id: 'anonymous', role: null },
      ...adminRoles.map((role) => ({ id: `account-${role}`, role })),
    ]

    expect(accounts.map((account) => [account.id, canAccessAdminPermission(account.role, 'content', 'write')])).toEqual([
      ['anonymous', false],
      ['account-editor', true],
      ['account-moderator', false],
      ['account-support', false],
      ['account-administrator', true],
      ['account-super_administrator', true],
    ])

    expect(canManageAdminRole('administrator', 'support')).toBe(true)
    expect(canManageAdminRole('administrator', 'super_administrator')).toBe(false)
    expect(canManageAdminRole('super_administrator', 'administrator')).toBe(true)
    expect(hasAdminRole('support', 'editor')).toBe(false)
  })

  it('tests route-level authorization helpers for allowed and refused accounts', () => {
    expect(captureDecision(() => requireRecipeWriteAccess('editor'))).toBe('allowed')
    expect(captureDecision(() => requireRecipeWriteAccess('support'))).toBe('denied')
    expect(captureDecision(() => requireRecipeDeleteAccess('administrator'))).toBe('allowed')
    expect(captureDecision(() => requireRecipeDeleteAccess('editor'))).toBe('denied')
    expect(captureDecision(() => requireRecipeMediaAccess('editor'))).toBe('allowed')
    expect(captureDecision(() => requireRetailCatalogAccess('moderator'))).toBe('denied')
    expect(captureDecision(() => requireCommunityModerationReadAccess('editor'))).toBe('allowed')
    expect(captureDecision(() => requireCommunityModerationDecisionAccess('editor'))).toBe('denied')
    expect(captureDecision(() => requireSupportUserReadAccess('support'))).toBe('allowed')
    expect(captureDecision(() => requireSupportProcedureAccess('support'))).toBe('denied')
    expect(captureDecision(() => requireContentSettingsAccess('editor'))).toBe('allowed')
    expect(captureDecision(() => requireFeatureFlagAccess('editor', true))).toBe('denied')
    expect(captureDecision(() => requireFeatureFlagAccess('administrator', true))).toBe('allowed')
  })
})
