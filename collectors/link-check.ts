import * as cheerio from 'cheerio'
import { fetchWithRetry } from '@/lib/utils'
import { USER_AGENT, MAX_INTERNAL_LINKS_TO_CHECK } from '@/lib/constants'
import type { LinkCheckData, BrokenLink, RedirectLink } from '@/lib/types'

export async function collectLinkCheck(
  url: string,
  _auditId: string,
): Promise<LinkCheckData> {
  // Fetch HTML independently (collector independence — runs in parallel)
  const html = await fetchWithRetry(
    async () => {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
        redirect: 'follow',
      })
      if (!response.ok) {
        throw new Error(`Link check HTML fetch failed: ${response.status}`)
      }
      return response.text()
    },
    2,
    'link-check-html',
  )

  const internalLinks = extractInternalLinks(html, url)
  const linksToCheck = internalLinks.slice(0, MAX_INTERNAL_LINKS_TO_CHECK)

  const results = await Promise.allSettled(
    linksToCheck.map((link) => checkLink(link, url)),
  )

  const broken: BrokenLink[] = []
  const redirects: RedirectLink[] = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'rejected') continue

    const { statusCode, redirectsTo } = result.value
    const linkUrl = linksToCheck[i]

    if (statusCode >= 400) {
      broken.push({
        url: linkUrl,
        statusCode,
        sourceUrl: url,
      })
    } else if (statusCode >= 300 && statusCode < 400 && redirectsTo) {
      redirects.push({
        url: linkUrl,
        redirectsTo,
        statusCode,
      })
    }
  }

  return {
    totalChecked: linksToCheck.length,
    broken,
    redirects,
  }
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html)
  const base = new URL(baseUrl)
  const links: string[] = []

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return

    try {
      const resolved = new URL(href, base.href)
      if (
        resolved.hostname === base.hostname &&
        (resolved.protocol === 'http:' || resolved.protocol === 'https:')
      ) {
        links.push(resolved.href)
      }
    } catch {
      // Skip malformed URLs
    }
  })

  return [...new Set(links)]
}

interface LinkCheckResult {
  readonly statusCode: number
  readonly redirectsTo: string | null
}

async function checkLink(
  linkUrl: string,
  _sourceUrl: string,
): Promise<LinkCheckResult> {
  const response = await fetch(linkUrl, {
    method: 'HEAD',
    redirect: 'manual',
    headers: { 'User-Agent': USER_AGENT },
  })

  const redirectsTo =
    response.status >= 300 && response.status < 400
      ? response.headers.get('location')
      : null

  return {
    statusCode: response.status,
    redirectsTo,
  }
}
