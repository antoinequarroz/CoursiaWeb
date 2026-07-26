import { buildCanonicalUrl, publicSeoContent } from '#shared/public-site/seo-content'

export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl
  const urls = publicSeoContent.publicRoutes
    .map((route) => {
      return [
        '  <url>',
        `    <loc>${buildCanonicalUrl(siteUrl, route)}</loc>`,
        '    <changefreq>weekly</changefreq>',
        '    <priority>0.7</priority>',
        '  </url>',
      ].join('\n')
    })
    .join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')

  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', urls, '</urlset>'].join('\n')
})

