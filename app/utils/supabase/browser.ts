import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '#shared/supabase/database.types'

export const createSupabaseBrowserClient = () => {
  const config = useRuntimeConfig()

  return createBrowserClient<Database>(
    config.public.supabaseUrl,
    config.public.supabasePublishableKey,
  )
}
