import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertNonTechnicalSettingKey,
  buildContentPreview,
  contentEntrySchema,
  featureFlagSchema,
} from '../shared/validation/content-settings'

describe('COUR-106 content and non-technical settings management', () => {
  const contentPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/contenus.vue'), 'utf8')
  const settingsPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/parametres.vue'), 'utf8')
  const contentUtil = readFileSync(resolve(process.cwd(), 'server/utils/content-settings.ts'), 'utf8')
  const createRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/content/index.post.ts'), 'utf8')
  const updateRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/content/[id].put.ts'), 'utf8')
  const archiveRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/content/[id]/archive.post.ts'), 'utf8')
  const previewRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/content/[id]/preview.get.ts'), 'utf8')
  const historyRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/content/history.get.ts'), 'utf8')
  const flagRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/feature-flags/index.post.ts'), 'utf8')

  it('administers FAQ marketing texts links and announcements', () => {
    expect(contentEntrySchema.safeParse({
      key: 'faq.allergies',
      kind: 'faq',
      title: 'Comment gerer les allergies ?',
      body: 'Coursia permet de filtrer les recettes selon les besoins du foyer.',
      status: 'draft',
    }).success).toBe(true)

    expect(contentEntrySchema.safeParse({
      key: 'footer.store-link',
      kind: 'link',
      title: 'App Store',
      status: 'draft',
    }).success).toBe(false)

    expect(contentPage).toContain('FAQ, textes marketing, liens et annonces')
  })

  it('supports publication and archive dates', () => {
    expect(contentEntrySchema.safeParse({
      key: 'announcement.launch',
      kind: 'announcement',
      title: 'Lancement',
      status: 'scheduled',
      publishAt: '2026-08-01T08:00:00+02:00',
      archiveAt: '2026-08-15T08:00:00+02:00',
    }).success).toBe(true)

    expect(contentEntrySchema.safeParse({
      key: 'announcement.bad-date',
      kind: 'announcement',
      title: 'Dates invalides',
      status: 'scheduled',
      publishAt: '2026-08-15T08:00:00+02:00',
      archiveAt: '2026-08-01T08:00:00+02:00',
    }).success).toBe(false)

    expect(archiveRoute).toContain("status: 'archived'")
  })

  it('provides a preview before publication', () => {
    expect(buildContentPreview({
      title: 'Titre',
      body: 'Texte',
      url: null,
      kind: 'marketing_text',
      status: 'draft',
      publish_at: null,
      archive_at: null,
    }).visibility).toBe('preview_only')
    expect(previewRoute).toContain('previewContentEntry')
    expect(contentPage).toContain('Apercu')
  })

  it('keeps technical settings and secrets out of the module', () => {
    expect(() => assertNonTechnicalSettingKey('marketing.hero')).not.toThrow()
    expect(() => assertNonTechnicalSettingKey('service_role_secret')).toThrow('hors de ce module')
    expect(contentUtil).toContain('assertNonTechnicalSettingKey')
    expect(contentPage).toContain('Parametres techniques et secrets hors module')
    expect(settingsPage).toContain('service_role')
  })

  it('protects and audits critical feature flags', () => {
    expect(featureFlagSchema.safeParse({
      key: 'critical.checkout',
      name: 'Checkout',
      enabled: true,
      critical: true,
      rolloutPercentage: 10,
    }).success).toBe(false)

    expect(featureFlagSchema.safeParse({
      key: 'critical.checkout',
      name: 'Checkout',
      enabled: true,
      critical: true,
      rolloutPercentage: 10,
      reason: 'Activation controlee support',
    }).success).toBe(true)

    expect(contentUtil).toContain('requireFeatureFlagAccess')
    expect(flagRoute).toContain("resourceType: 'feature_flag'")
    expect(flagRoute).toContain('reason')
  })

  it('keeps author history for modifications', () => {
    expect(createRoute).toContain('createContentRevision')
    expect(updateRoute).toContain('createContentRevision')
    expect(archiveRoute).toContain('createContentRevision')
    expect(historyRoute).toContain('content_entry_revisions')
    expect(contentPage).toContain('Historique auteur')
  })
})
