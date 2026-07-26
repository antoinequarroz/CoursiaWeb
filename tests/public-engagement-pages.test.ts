import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { publicEngagementContent } from '../shared/public-site/engagement-content'
import {
  contactRequestSchema,
  isLikelyAutomatedSubmission,
  waitlistRequestSchema,
} from '../shared/validation/public-engagement'

describe('COUR-92 FAQ contact and waitlist', () => {
  const faqPage = readFileSync(resolve(process.cwd(), 'app/pages/faq.vue'), 'utf8')
  const contactPage = readFileSync(resolve(process.cwd(), 'app/pages/contact.vue'), 'utf8')
  const waitlistPage = readFileSync(resolve(process.cwd(), 'app/pages/liste-attente.vue'), 'utf8')
  const contactApi = readFileSync(resolve(process.cwd(), 'server/api/public/contact.post.ts'), 'utf8')
  const waitlistApi = readFileSync(resolve(process.cwd(), 'server/api/public/waitlist.post.ts'), 'utf8')
  const homepage = readFileSync(resolve(process.cwd(), 'app/pages/index.vue'), 'utf8')

  it('covers fonctionnement, prix, données, allergies and disponibilité in the FAQ', () => {
    expect(publicEngagementContent.faq.map((item) => item.topic)).toEqual([
      'Fonctionnement',
      'Prix',
      'Données',
      'Allergies',
      'Disponibilité',
    ])
    expect(faqPage).toContain('useSeoMeta')
  })

  it('validates contact submissions and protects against abuse', () => {
    const valid = contactRequestSchema.safeParse({
      name: 'Antoine',
      email: 'antoine@example.com',
      reason: 'Question produit',
      message: 'Bonjour, je veux suivre le lancement de Coursia.',
      source: 'contact',
      consent: true,
      website: '',
      submittedAt: Date.now() - 5000,
    })

    expect(valid.success).toBe(true)
    expect(contactRequestSchema.safeParse({ ...valid.data, website: 'bot' }).success).toBe(false)
    expect(isLikelyAutomatedSubmission(Date.now())).toBe(true)
    expect(contactApi).toContain('contactRequestSchema')
    expect(contactApi).toContain('isLikelyAutomatedSubmission')
    expect(contactPage).toContain('Vos champs restent remplis')
  })

  it('records waitlist consent and source with minimized data', () => {
    const valid = waitlistRequestSchema.safeParse({
      email: 'parent@example.com',
      source: 'landing',
      consent: true,
      householdSize: 4,
      interests: ['Planning', 'Budget'],
      website: '',
      submittedAt: Date.now() - 5000,
    })

    expect(valid.success).toBe(true)
    expect(waitlistApi).toContain('source')
    expect(waitlistApi).toContain('consent')
    expect(waitlistPage).toContain('source')
    expect(waitlistPage).toContain('consent')
    expect(waitlistPage).toContain('suppression')
  })

  it('links FAQ, contact and waitlist from the public landing', () => {
    expect(homepage).toContain('/faq')
    expect(homepage).toContain('/contact')
    expect(homepage).toContain('/liste-attente')
  })
})

