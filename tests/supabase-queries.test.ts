import { describe, expect, it } from 'vitest'
import {
  buildAuthenticatedEnrollmentsQuery,
  buildPublicCoursesQuery,
} from '#shared/supabase/queries/courses'
import {
  authenticatedEnrollmentsQuerySchema,
  courseListQuerySchema,
} from '#shared/validation/course'

const createQueryRecorder = () => {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const chain = {
    select: (...args: unknown[]) => {
      calls.push({ method: 'select', args })
      return chain
    },
    eq: (...args: unknown[]) => {
      calls.push({ method: 'eq', args })
      return chain
    },
    order: (...args: unknown[]) => {
      calls.push({ method: 'order', args })
      return chain
    },
    limit: (...args: unknown[]) => {
      calls.push({ method: 'limit', args })
      return chain
    },
  }

  const client = {
    from: (...args: unknown[]) => {
      calls.push({ method: 'from', args })
      return chain
    },
  }

  return { calls, client }
}

describe('Supabase query builders', () => {
  it('builds the public published courses query', () => {
    const { calls, client } = createQueryRecorder()
    const query = courseListQuerySchema.parse({ limit: '6' })

    buildPublicCoursesQuery(client as never, query)

    expect(calls).toContainEqual({ method: 'from', args: ['courses'] })
    expect(calls).toContainEqual({ method: 'eq', args: ['is_published', true] })
    expect(calls).toContainEqual({ method: 'limit', args: [6] })
  })

  it('builds the authenticated enrollments query scoped to the current user', () => {
    const { calls, client } = createQueryRecorder()
    const query = authenticatedEnrollmentsQuerySchema.parse({ status: 'active' })

    buildAuthenticatedEnrollmentsQuery(client as never, 'user-123', query)

    expect(calls).toContainEqual({ method: 'from', args: ['enrollments'] })
    expect(calls).toContainEqual({ method: 'eq', args: ['user_id', 'user-123'] })
    expect(calls).toContainEqual({ method: 'eq', args: ['status', 'active'] })
  })
})
