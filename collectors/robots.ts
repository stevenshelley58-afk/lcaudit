import { fetchWithRetry } from '@/lib/utils'
import { USER_AGENT } from '@/lib/constants'
import type { RobotsData } from '@/lib/types'

export async function collectRobots(
  url: string,
  _auditId: string,
): Promise<RobotsData> {
  const robotsUrl = new URL('/robots.txt', url).href

  const response = await fetchWithRetry(
    async () =>
      fetch(robotsUrl, {
        headers: { 'User-Agent': USER_AGENT },
      }),
    2,
    'robots-fetch',
  )

  if (response.status === 404) {
    return { exists: false, content: null, disallowRules: [], sitemapRefs: [] }
  }

  if (!response.ok) {
    throw new Error(`robots.txt fetch failed: ${response.status}`)
  }

  const content = await response.text()

  return {
    exists: true,
    content,
    disallowRules: extractDisallowRules(content),
    sitemapRefs: extractSitemapRefs(content),
  }
}

function extractDisallowRules(content: string): string[] {
  return content
    .split('\n')
    .filter((line) => line.toLowerCase().startsWith('disallow:'))
    .map((line) => line.split(':').slice(1).join(':').trim())
    .filter((rule) => rule.length > 0)
}

function extractSitemapRefs(content: string): string[] {
  return content
    .split('\n')
    .filter((line) => line.toLowerCase().startsWith('sitemap:'))
    .map((line) => line.split(':').slice(1).join(':').trim())
    .filter((ref) => ref.length > 0)
}
