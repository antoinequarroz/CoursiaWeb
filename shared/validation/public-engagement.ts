import { z } from 'zod'

const honeypotSchema = z.string().max(0, 'Protection anti-abus déclenchée').optional().default('')

export const contactRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  reason: z.string().trim().min(2).max(80),
  message: z.string().trim().min(10).max(2000),
  source: z.string().trim().min(2).max(80).default('contact'),
  consent: z.literal(true),
  website: honeypotSchema,
  submittedAt: z.number().int().positive(),
})

export const waitlistRequestSchema = z.object({
  email: z.string().trim().email().max(160),
  source: z.string().trim().min(2).max(80),
  consent: z.literal(true),
  householdSize: z.number().int().min(1).max(12).optional(),
  interests: z.array(z.string().trim().min(2).max(80)).max(8).default([]),
  website: honeypotSchema,
  submittedAt: z.number().int().positive(),
})

export type ContactRequest = z.infer<typeof contactRequestSchema>
export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>

export const isLikelyAutomatedSubmission = (submittedAt: number, now = Date.now()) => {
  const elapsedMs = now - submittedAt

  return elapsedMs < 1200 || elapsedMs > 1000 * 60 * 60 * 6
}

