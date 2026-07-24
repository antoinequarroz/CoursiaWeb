import { describe, expect, it } from 'vitest'
import { coursiaDesignTokens } from '#shared/design-system/tokens'
import { siteConfig } from '#shared/config/site'

describe('siteConfig', () => {
  it('defines the Coursia site name', () => {
    expect(siteConfig.name).toBe('Coursia')
  })
})

describe('coursiaDesignTokens', () => {
  it('defines light and dark theme primary colors', () => {
    expect(coursiaDesignTokens.color.light.primary).toBe('#1746a2')
    expect(coursiaDesignTokens.color.dark.primary).toBe('#80a7ff')
  })
})
