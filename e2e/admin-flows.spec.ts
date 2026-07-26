import { expect, test } from '@playwright/test'
import { mockAdminImportApis, mockAdminRecipeApis } from './fixtures'

test('connexion admin invalide et controle de role visible', async ({ page }) => {
  await page.goto('/auth/login?redirect=/admin')
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Mot de passe')).toBeVisible()

  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: true }),
    })
  })
  await page.goto('/admin')
  await expect(page.getByText(/R.*le courant.*administrator/)).toBeVisible()
  await expect(page.getByRole('link', { name: /Param/i })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Utilisateurs' })).toBeVisible()
})

test('creation, previsualisation et publication recette', async ({ page }) => {
  const { recipeId } = await mockAdminRecipeApis(page)

  await page.goto('/admin/recettes')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Titre').fill('Risotto E2E')
  await page.getByLabel('Slug').fill('risotto-e2e')
  await page.getByRole('spinbutton', { name: 'Portions', exact: true }).fill('4')
  await page.getByLabel(/Dur/).fill('35')
  await page.getByLabel('Source').fill('Fixture E2E')
  await Promise.all([
    page.waitForResponse(/\/api\/admin\/recipes\/?$/),
    page.getByRole('button', { name: /Enregistrer le brouillon/i }).click(),
  ])

  await page.goto('/admin/recettes/publication')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('ID de recette').fill(recipeId)
  await expect(page.getByLabel('ID de recette')).toHaveValue(recipeId)
  await Promise.all([
    page.waitForResponse(/\/api\/admin\/recipes\/[^/]+\/preview\/?$/),
    page.getByRole('button', { name: /Charger/i }).click(),
  ])
  await expect(page.getByText(/Aucun champ bloquant/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Risotto E2E' }).first()).toBeVisible()

  await Promise.all([
    page.waitForResponse(/\/api\/admin\/recipes\/[^/]+\/publish\/?$/),
    page.getByRole('button', { name: /Publier avec droits/i }).click(),
  ])
  await expect(page.getByText('Workflow de publication mis a jour par le test E2E.')).toBeVisible()
})

test('import CSV et gestion d une erreur', async ({ page }) => {
  await mockAdminImportApis(page)

  await page.goto('/admin/recettes/import/')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /Import CSV/i })).toBeVisible()
  const csvInput = page.getByLabel('Contenu CSV')
  await expect(csvInput).toBeVisible()
  await csvInput.fill('slug,title,status\nbad-slug,Recette invalide,published')
  await expect(csvInput).toHaveValue('slug,title,status\nbad-slug,Recette invalide,published')
  await Promise.all([
    page.waitForResponse(/\/api\/admin\/recipes\/import\/?$/),
    page.getByRole('button', { name: /visualiser/i }).click(),
  ])
  await expect(page.getByRole('heading', { name: /Rapport/i })).toBeVisible()
  await expect(page.getByText('Erreurs : 1')).toBeVisible()
  await expect(page.getByText('Validation de ligne invalide.')).toBeVisible()
})
