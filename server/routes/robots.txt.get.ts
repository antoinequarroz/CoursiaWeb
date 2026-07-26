import { publicSeoContent } from '#shared/public-site/seo-content'

export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl.replace(/\/$/, '')

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /auth',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    `# ${publicSeoContent.consentMode}`,
  ].join('\n')
})

