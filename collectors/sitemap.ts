import { fetchWithRetry } from '@/lib/utils'
import { USER_AGENT } from '@/lib/constants'
import type { SitemapData } from '@/lib/types'

const MAX_SAMPLE_URLS = 10

export async function collectSitemap(
  url: string,
  _auditId: string,
): Promise<SitemapData> {
  const sitemapUrl = new URL('/sitemap.xml', url).href

  const response = await fetchWithRetry(
    async () =>
      fetch(sitemapUrl, {
        headers: { 'User-Agent': USER_AGENT },
      }),
    2,
    'sitemap-fetch',
  )

  if (response.status === 404) {
    return { exists: false, urlCount: 0, sampleUrls: [], lastmod: null }
  }

  if (!response.ok) {
    throw new Error(`sitemap.xml fetch failed: ${response.status}`)
  }

  const content = await response.text()
  return parseSitemap(content)
}

function parseSitemap(xml: string): SitemapData {
  const locMatches = [...xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)]
  const urls = locMatches.map((m) => m[1])

  const lastmodMatches = [...xml.matchAll(/<lastmod>\s*(.*?)\s*<\/lastmod>/gi)]
  const lastmod = lastmodMatches.length > 0
    ? lastmodMatches[lastmodMatches.length - 1][1]
    : null

  return {
    exists: true,
    urlCount: urls.length,
    sampleUrls: urls.slice(0, MAX_SAMPLE_URLS),
    lastmod,
  }
}
