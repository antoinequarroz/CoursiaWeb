import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  impersonationDisabledMessage,
  maskEmail,
  maskSupportUser,
  revenueCatEventSchema,
  supportControlledProcedureSchema,
  supportUserSearchSchema,
} from '../shared/validation/support-users'

describe('COUR-105 support users and subscriptions view', () => {
  const usersPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/utilisateurs.vue'), 'utf8')
  const subscriptionsPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/abonnements.vue'), 'utf8')
  const supportUtil = readFileSync(resolve(process.cwd(), 'server/utils/support-users.ts'), 'utf8')
  const lookupRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/support-users/lookup.get.ts'), 'utf8')
  const procedureRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/support-users/procedure.post.ts'), 'utf8')

  it('requires controlled search by id or email', () => {
    expect(supportUserSearchSchema.safeParse({}).success).toBe(false)
    expect(supportUserSearchSchema.safeParse({ userId: '00000000-0000-4000-8000-000000000001' }).success).toBe(true)
    expect(supportUserSearchSchema.safeParse({ email: 'user@example.com' }).success).toBe(true)
    expect(usersPage).toContain('Recherche controlee par identifiant ou email')
    expect(lookupRoute).toContain('supportUserSearchSchema')
  })

  it('shows account status app version and subscription tier while masking unnecessary sensitive data', () => {
    expect(maskEmail('julie@example.com')).toBe('ju***@example.com')
    expect(maskSupportUser({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'julie@example.com',
      accountStatus: 'active',
      appVersion: '1.2.3',
      subscriptionTier: 'premium',
    })).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      emailMasked: 'ju***@example.com',
      accountStatus: 'active',
      appVersion: '1.2.3',
      subscriptionTier: 'premium',
    })
    expect(usersPage).toContain('Statut compte')
    expect(usersPage).toContain('Version app')
    expect(usersPage).toContain('Palier abonnement')
    expect(lookupRoute).toContain('sensitiveDataMasked')
  })

  it('shows useful RevenueCat events as read only', () => {
    expect(revenueCatEventSchema.safeParse({
      id: 'event-1',
      userId: '00000000-0000-4000-8000-000000000001',
      type: 'INITIAL_PURCHASE',
      entitlement: 'premium',
      productId: 'premium_monthly',
      receivedAt: '2026-07-26T20:00:00+02:00',
    }).success).toBe(true)
    expect(supportUtil).toContain('getRevenueCatEventsForSupport')
    expect(supportUtil).toContain('payload_redacted')
    expect(usersPage).toContain('RevenueCat utiles - lecture seule')
    expect(subscriptionsPage).toContain('RevenueCat - lecture seule')
  })

  it('controls export deletion and block procedures', () => {
    expect(supportControlledProcedureSchema.safeParse({
      action: 'delete',
      userId: '00000000-0000-4000-8000-000000000001',
      reason: 'Demande RGPD validee par ticket support',
      ticketReference: 'SUP-123',
      confirmed: true,
    }).success).toBe(true)
    expect(supportControlledProcedureSchema.safeParse({
      action: 'block',
      userId: '00000000-0000-4000-8000-000000000001',
      reason: 'court',
      ticketReference: 'SUP-123',
      confirmed: true,
    }).success).toBe(false)
    expect(usersPage).toContain('Export, suppression et blocage')
    expect(procedureRoute).toContain('supportControlledProcedureSchema')
    expect(procedureRoute).toContain('requireSupportProcedureAccess')
  })

  it('does not add impersonation by default', () => {
    expect(impersonationDisabledMessage).toContain('impersonation')
    expect(usersPage).toContain('impersonationDisabledMessage')
    expect(lookupRoute).toContain('impersonationEnabled: false')
    expect(usersPage).not.toContain('impersonate')
  })

  it('audits sensitive lookups and support procedures', () => {
    expect(lookupRoute).toContain('writeAdminAuditLog')
    expect(lookupRoute).toContain("resourceType: 'support_user_lookup'")
    expect(procedureRoute).toContain('writeAdminAuditLog')
    expect(procedureRoute).toContain("resourceType: 'support_user_procedure'")
    expect(usersPage).toContain('Consultation auditee')
  })
})
