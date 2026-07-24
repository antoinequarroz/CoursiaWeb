import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { H3Event } from 'h3'
import { getCookie, getHeader, setCookie } from 'h3'
import type { Database } from '#shared/supabase/database.types'

const getSupabasePublicConfig = () => {
  const config = useRuntimeConfig()

  return {
    url: config.public.supabaseUrl,
    publishableKey: config.public.supabasePublishableKey,
  }
}

export const createSupabaseServerClient = (event: H3Event) => {
  const { url, publishableKey } = getSupabasePublicConfig()

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      get(name: string) {
        return getCookie(event, name)
      },
      set(name: string, value: string, options: CookieOptions) {
        setCookie(event, name, value, options)
      },
      remove(name: string, options: CookieOptions) {
        setCookie(event, name, '', { ...options, maxAge: 0 })
      },
    },
    global: {
      headers: {
        authorization: getHeader(event, 'authorization') ?? '',
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
