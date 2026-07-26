import type { Page, Route } from '@playwright/test'

const json = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

export const mockPublicEngagementApis = async (page: Page) => {
  await page.route('**/api/public/contact', async (route) => {
    await json(route, {
      ok: true,
      message: 'Votre message a bien ete recu par le test E2E.',
    })
  })

  await page.route('**/api/public/waitlist', async (route) => {
    await json(route, {
      ok: true,
      message: 'Inscription confirmee par le test E2E.',
    })
  })
}

export const mockAdminRecipeApis = async (page: Page) => {
  const recipeId = '00000000-0000-4000-8000-000000000108'

  await page.route('**/api/auth/session', async (route) => {
    await json(route, { authenticated: true })
  })

  await page.route(/\/api\/admin\/recipes\/?$/, async (route) => {
    if (route.request().method() === 'POST') {
      await json(route, {
        data: {
          id: recipeId,
          title: 'Risotto E2E',
          slug: 'risotto-e2e',
          status: 'draft',
        },
      })
      return
    }

    await json(route, { data: [] })
  })

  await page.route(/\/api\/admin\/recipes\/[^/]+\/preview\/?$/, async (route) => {
    await json(route, {
      data: {
        id: recipeId,
        title: 'Risotto E2E',
        slug: 'risotto-e2e',
        status: 'review',
      },
      preview: {
        blockingFields: [],
        mobile: {
          title: 'Risotto E2E',
          subtitle: 'Famille',
          status: 'review',
          meta: {
            portions: 4,
            durationMinutes: 35,
            difficulty: 'medium',
          },
          ingredients: [],
          steps: [],
        },
        web: {
          title: 'Risotto E2E',
          slug: 'risotto-e2e',
          source: 'Fixture E2E',
          categories: ['Famille'],
          status: 'review',
        },
      },
    })
  })

  await page.route(/\/api\/admin\/recipes\/[^/]+\/publish\/?$/, async (route) => {
    await json(route, {
      data: {
        id: recipeId,
        title: 'Risotto E2E',
        slug: 'risotto-e2e',
        status: 'published',
      },
      behavior: 'Workflow de publication mis a jour par le test E2E.',
      preview: {
        blockingFields: [],
        mobile: {
          title: 'Risotto E2E',
          subtitle: 'Famille',
          status: 'published',
          meta: {
            portions: 4,
            durationMinutes: 35,
            difficulty: 'medium',
          },
          ingredients: [],
          steps: [],
        },
        web: {
          title: 'Risotto E2E',
          slug: 'risotto-e2e',
          source: 'Fixture E2E',
          categories: ['Famille'],
          status: 'published',
        },
      },
    })
  })

  return { recipeId }
}

export const mockAdminImportApis = async (page: Page) => {
  await page.route('**/api/auth/session', async (route) => {
    await json(route, { authenticated: true })
  })

  await page.route(/\/api\/admin\/recipes\/import\/?$/, async (route) => {
    const payload = (() => {
      try {
        return route.request().postDataJSON() as { content?: string }
      } catch {
        return {}
      }
    })()

    const hasError = !payload.content || payload.content.includes('bad-slug')

    await json(route, {
      data: {
        idempotencyKey: 'e2e-import-report-0000000000000000',
        dryRun: true,
        creates: hasError ? 0 : 1,
        updates: 0,
        duplicates: 0,
        errors: hasError ? 1 : 0,
        rows: [
          {
            rowNumber: 2,
            action: hasError ? 'error' : 'create',
            slug: hasError ? 'bad-slug' : 'risotto-e2e',
            field: hasError ? 'slug' : undefined,
            message: hasError ? 'Validation de ligne invalide.' : 'Ligne valide.',
          },
        ],
      },
      idempotentReplay: false,
    })
  })
}
