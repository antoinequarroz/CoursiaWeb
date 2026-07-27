import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { H3Event } from 'h3'
import { getHeader, parseCookies, setCookie, setHeader } from 'h3'
import type { Database } from '#shared/supabase/database.types'

const getSupabasePublicConfig = () => {
  const config = useRuntimeConfig()

  return {
    url: config.public.supabaseUrl,
    publishableKey: config.public.supabasePublishableKey,
  }
}

const getSupabaseProjectRef = (url: string) => new URL(url).hostname.split('.')[0]

export const getSupabaseAccessTokenFromCookies = (event: H3Event) => {
  const { url } = getSupabasePublicConfig()
  const cookies = parseCookies(event)
  const authCookie = cookies[`sb-${getSupabaseProjectRef(url)}-auth-token`]

  if (!authCookie) {
    return null
  }

  try {
    const sessionJson = authCookie.startsWith('base64-')
      ? Buffer.from(authCookie.slice('base64-'.length), 'base64').toString('utf8')
      : decodeURIComponent(authCookie)
    const session = JSON.parse(sessionJson) as { access_token?: unknown }

    return typeof session.access_token === 'string' ? session.access_token : null
  } catch {
    return null
  }
}

export const createSupabaseServerClient = (event: H3Event) => {
  const { url, publishableKey } = getSupabasePublicConfig()
  const authorization = getHeader(event, 'authorization')

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return Object.entries(parseCookies(event)).map(([name, value]) => ({
          name,
          value,
        }))
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(event, name, value, options)
        })
        setHeader(event, 'Cache-Control', 'private, no-store')
      },
    },
    ...(authorization
      ? {
          global: {
            headers: {
              authorization,
            },
          },
        }
      : {}),
  })
}

export const createSupabaseUserScopedClient = (accessToken: string) => {
  const { url, publishableKey } = getSupabasePublicConfig()

  return createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

export const createSupabaseServiceRoleClient = () => {
  const config = useRuntimeConfig()

  if (!config.supabaseServiceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase service role key is not configured on the server.',
    })
  }

  return createClient<Database>(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
