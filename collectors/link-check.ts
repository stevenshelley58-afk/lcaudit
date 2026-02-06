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

  const { broken, redirects } = results.reduce<{
    readonly broken: readonly BrokenLink[]
    readonly redirects: readonly RedirectLink[]
  }>(
    (acc, result, i) => {
      if (result.status === 'rejected') return acc

      const { statusCode, redirectsTo } = result.value
      const linkUrl = linksToCheck[i]

      if (statusCode >= 400) {
        return {
          ...acc,
          broken: [...acc.broken, { url: linkUrl, statusCode, sourceUrl: url }],
        }
      }
      if (statusCode >= 300 && statusCode < 400 && redirectsTo) {
        return {
          ...acc,
          redirects: [...acc.redirects, { url: linkUrl, redirectsTo, statusCode }],
        }
      }
      return acc
    },
    { broken: [], redirects: [] },
  )

  return {
    totalChecked: linksToCheck.length,
    broken: [...broken],
    redirects: [...redirects],
  }
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html)
  const base = new URL(baseUrl)

  const hrefs: string[] = $('a[href]')
    .map((_, el) => $(el).attr('href') ?? '')
    .get()
    .filter((href) => href.length > 0)

  const resolved = hrefs.reduce<readonly string[]>((acc, href) => {
    try {
      const url = new URL(href, base.href)
      if (
        url.hostname === base.hostname &&
        (url.protocol === 'http:' || url.protocol === 'https:')
      ) {
        return [...acc, url.href]
      }
      return acc
    } catch {
      return acc
    }
  }, [])

  return [...new Set(resolved)]
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
