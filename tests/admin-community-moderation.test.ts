import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  communityModerationDecisionInputSchema,
  communitySubmissionSchema,
  getCommunitySubmissionAgeDays,
  getCommunitySubmissionMissingChecks,
  mapDecisionToStatus,
} from '../shared/validation/community-moderation'

describe('COUR-104 community recipe moderation queue', () => {
  const moderationPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/moderation.vue'), 'utf8')
  const moderationUtil = readFileSync(resolve(process.cwd(), 'server/utils/community-moderation.ts'), 'utf8')
  const listRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/community-moderation/index.get.ts'), 'utf8')
  const createRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/community-moderation/index.post.ts'), 'utf8')
  const decisionRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/community-moderation/[id]/decision.post.ts'),
    'utf8',
  )
  const decisionsRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/community-moderation/decisions.get.ts'),
    'utf8',
  )

  it('lists submissions with filters priority and age', () => {
    expect(communitySubmissionSchema.safeParse({
      title: 'Tarte aux pommes',
      priority: 'high',
      source: 'Contribution utilisateur',
      rights: 'Auteur confirme',
    }).success).toBe(true)
    expect(getCommunitySubmissionAgeDays('2026-07-20T00:00:00+02:00', new Date('2026-07-26T00:00:00+02:00'))).toBe(6)
    expect(listRoute).toContain('priority')
    expect(listRoute).toContain('submitted_at')
    expect(moderationPage).toContain('Anciennete')
  })

  it('checks recipe photo source rights and allergens', () => {
    const missing = getCommunitySubmissionMissingChecks({
      recipeChecked: true,
      photoChecked: false,
      sourceChecked: true,
      rightsChecked: false,
      allergensChecked: true,
    })

    expect(missing).toEqual(['photoChecked', 'rightsChecked'])
    expect(moderationPage).toContain('Recette verifiee')
    expect(moderationPage).toContain('Photo verifiee')
    expect(moderationPage).toContain('Source verifiee')
    expect(moderationPage).toContain('Droits verifies')
    expect(moderationPage).toContain('Allergenes verifies')
  })

  it('accepts rejects requests correction and archives', () => {
    expect(mapDecisionToStatus('accept')).toBe('accepted')
    expect(mapDecisionToStatus('reject')).toBe('rejected')
    expect(mapDecisionToStatus('request_correction')).toBe('correction_requested')
    expect(mapDecisionToStatus('archive')).toBe('archived')
    expect(moderationPage).toContain('Accepter')
    expect(moderationPage).toContain('Refuser')
    expect(moderationPage).toContain('Demander correction')
    expect(moderationPage).toContain('Archiver')
  })

  it('requires a reason for rejection', () => {
    expect(communityModerationDecisionInputSchema.safeParse({
      decision: 'reject',
      checklist: {
        recipeChecked: true,
        photoChecked: true,
        sourceChecked: true,
        rightsChecked: true,
        allergensChecked: true,
      },
    }).success).toBe(false)
    expect(moderationPage).toContain('obligatoire pour le refus')
  })

  it('distinguishes editor and moderator permissions', () => {
    expect(moderationUtil).toContain('requireCommunityModerationReadAccess')
    expect(moderationUtil).toContain('editor')
    expect(moderationUtil).toContain('requireCommunityModerationDecisionAccess')
    expect(moderationUtil).toContain('moderator')
    expect(listRoute).toContain('requireCommunityModerationReadAccess')
    expect(decisionRoute).toContain('requireCommunityModerationDecisionAccess')
  })

  it('audits all decisions and stays coordinated with community tickets', () => {
    expect(createRoute).toContain('writeAdminAuditLog')
    expect(createRoute).toContain("resourceType: 'community_recipe_submission'")
    expect(decisionRoute).toContain('writeAdminAuditLog')
    expect(decisionRoute).toContain("resourceType: 'community_moderation_decision'")
    expect(decisionsRoute).toContain('community_recipe_moderation_decisions')
    expect(moderationPage).toContain('COUR-29')
    expect(moderationPage).toContain('COUR-30')
    expect(moderationPage).toContain('COUR-72')
  })
})
