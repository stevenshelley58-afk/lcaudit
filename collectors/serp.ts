import { getGoogleCseKeys } from '@/lib/env'
import { fetchWithRetry } from '@/lib/utils'
import { GOOGLE_CSE_API_URL } from '@/lib/constants'
import type { SerpData, SerpResult } from '@/lib/types'

export async function collectSerp(
  url: string,
  _auditId: string,
): Promise<SerpData> {
  const keys = getGoogleCseKeys()
  if (!keys) {
    throw new Error('Google CSE API keys not configured')
  }

  const parsed = new URL(url)
  const domain = parsed.hostname

  const [siteResults, brandResults] = await Promise.all([
    searchGoogle(`site:${domain}`, keys.apiKey, keys.cseId),
    searchGoogle(domain.replace('www.', ''), keys.apiKey, keys.cseId),
  ])

  const indexedPages = siteResults.searchInformation?.totalResults
    ? parseInt(siteResults.searchInformation.totalResults, 10)
    : null

  const homepageSnippet =
    siteResults.items?.[0]?.snippet ?? null

  const brandSearchPresent = (brandResults.items ?? []).some(
    (item: CseItem) => {
      try {
        return new URL(item.link).hostname === domain
      } catch {
        return false
      }
    },
  )

  const topResults: SerpResult[] = (siteResults.items ?? [])
    .slice(0, 5)
    .map((item: CseItem) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet ?? '',
    }))

  return {
    indexedPages,
    homepageSnippet,
    brandSearchPresent,
    topResults,
  }
}

interface CseItem {
  readonly title: string
  readonly link: string
  readonly snippet?: string
}

interface CseResponse {
  readonly searchInformation?: {
    readonly totalResults?: string
  }
  readonly items?: readonly CseItem[]
}

async function searchGoogle(
  query: string,
  apiKey: string,
  cseId: string,
): Promise<CseResponse> {
  const params = new URLSearchParams({
    key: apiKey,
    cx: cseId,
    q: query,
    num: '10',
  })

  return fetchWithRetry(
    async () => {
      const response = await fetch(`${GOOGLE_CSE_API_URL}?${params}`)

      if (!response.ok) {
        throw new Error(`Google CSE error: ${response.status}`)
      }

      return response.json() as Promise<CseResponse>
    },
    2,
    `cse-search-${query.slice(0, 20)}`,
  )
}
