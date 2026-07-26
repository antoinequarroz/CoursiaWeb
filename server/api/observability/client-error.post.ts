import { z } from 'zod'

const clientErrorSchema = z.object({
  message: z.string().min(1).max(500),
  route: z.string().max(240).optional(),
  component: z.string().max(120).optional(),
  stack: z.string().max(2000).optional(),
  payload: z.unknown().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = clientErrorSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  captureObservabilityEvent({
    level: 'error',
    source: 'client',
    message: parsed.data.message,
    route: parsed.data.route,
    component: parsed.data.component,
    requestId: getRequestId(event),
    payload: {
      stack: parsed.data.stack,
      payload: parsed.data.payload,
    },
  })

  return {
    ok: true,
    requestId: getRequestId(event),
  }
})
