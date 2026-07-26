import { recipeCsvTemplate } from '#shared/validation/recipe-import'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeWriteAccess(admin.role)

  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', 'attachment; filename="coursia-recettes-template.csv"')

  return recipeCsvTemplate
})

