import { randomUUID } from 'node:crypto'

export default defineEventHandler((event) => {
  const requestId = getHeader(event, 'x-request-id') || randomUUID()

  event.context.requestId = requestId
  setHeader(event, 'x-request-id', requestId)
})
