import { expect, test } from '@playwright/test'
import { mockPublicEngagementApis } from './fixtures'

test.beforeEach(async ({ page }) => {
  await mockPublicEngagementApis(page)
})

test('navigation publique, contact et liste d attente', async ({ page }) => {
  await page.goto('/')
  const navigation = page.getByRole('navigation')
  await expect(navigation.getByRole('link', { name: 'Tarifs' })).toBeVisible()

  await navigation.getByRole('link', { name: 'Tarifs' }).click()
  await expect(page).toHaveURL(/\/tarifs/)
  await expect(page.getByRole('heading', { name: /Gratuit|Standard|Premium|Famille/i }).first()).toBeVisible()

  await page.goto('/contact')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Nom').fill('Test E2E')
  await page.getByLabel('Email').fill('e2e@example.com')
  await page.getByLabel('Message').fill('Message valide envoye depuis le parcours navigateur.')
  await page.getByLabel(/J.*accepte que Coursia/i).check()
  await expect(page.getByLabel(/J.*accepte que Coursia/i)).toBeChecked()
  await page.getByRole('button', { name: /Envoyer le message/i }).click()
  await expect(page.getByText(/message.*recu|message.*envoy/i)).toBeVisible()

  await page.goto('/liste-attente')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Email').fill('waitlist-e2e@example.com')
  await page.getByLabel(/Recettes/i).check()
  await page.getByLabel(/J.*accepte/i).check()
  await expect(page.getByLabel(/J.*accepte/i)).toBeChecked()
  await page.getByRole('button', { name: /Rejoindre la liste/i }).click()
  await expect(page.getByText(/Inscription.*confirm/i)).toBeVisible()
})
