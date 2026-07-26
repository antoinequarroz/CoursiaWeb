export const isE2eAdminAuthBypassAllowed = (env: NodeJS.ProcessEnv = process.env) => {
  return env.NUXT_E2E_BYPASS_ADMIN_AUTH === 'true' && env.NODE_ENV !== 'production'
}
