import * as cheerio from 'cheerio'
import { fetchWithRetry } from '@/lib/utils'
import { USER_AGENT } from '@/lib/constants'
import type { HtmlData } from '@/lib/types'

export async function collectHtml(
  url: string,
  _auditId: string,
): Promise<HtmlData> {
  const html = await fetchHtml(url)
  return parseHtml(html, url)
}

async function fetchHtml(url: string): Promise<string> {
  return fetchWithRetry(
    async () => {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      })

      if (!response.ok) {
        throw new Error(`HTML fetch error: ${response.status} ${response.statusText}`)
      }

      return response.text()
    },
    2,
    'html-fetch',
  )
}

function parseHtml(html: string, baseUrl: string): HtmlData {
  const $ = cheerio.load(html)
  const parsedBase = new URL(baseUrl)

  return {
    title: $('title').first().text().trim() || null,
    metaDescription:
      $('meta[name="description"]').attr('content')?.trim() || null,
    canonicalUrl: $('link[rel="canonical"]').attr('href')?.trim() || null,
    headings: {
      h1: extractTextArray($, 'h1'),
      h2: extractTextArray($, 'h2'),
      h3: extractTextArray($, 'h3'),
    },
    images: $('img')
      .map((_, el) => ({
        src: $(el).attr('src') ?? '',
        alt: $(el).attr('alt') ?? null,
        width: parseIntOrNull($(el).attr('width')),
        height: parseIntOrNull($(el).attr('height')),
      }))
      .get(),
    links: {
      internal: extractLinks($, parsedBase, 'internal'),
      external: extractLinks($, parsedBase, 'external'),
    },
    ogTags: {
      title: metaContent($, 'og:title'),
      description: metaContent($, 'og:description'),
      image: resolveUrl(metaContent($, 'og:image'), parsedBase),
      type: metaContent($, 'og:type'),
      url: metaContent($, 'og:url'),
    },
    twitterCard: {
      card: metaName($, 'twitter:card'),
      title: metaName($, 'twitter:title'),
      description: metaName($, 'twitter:description'),
      image: resolveUrl(metaName($, 'twitter:image'), parsedBase),
    },
    schemaOrg: extractSchemaOrg($),
    forms: $('form').length,
    wordCount: countWords($),
    language: $('html').attr('lang')?.trim() || null,
    favicon:
      $('link[rel="icon"]').attr('href')?.trim() ||
      $('link[rel="shortcut icon"]').attr('href')?.trim() ||
      null,
    viewport: $('meta[name="viewport"]').attr('content')?.trim() || null,
  }
}

function extractTextArray(
  $: cheerio.CheerioAPI,
  selector: string,
): string[] {
  return $(selector)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((text) => text.length > 0)
}

function extractLinks(
  $: cheerio.CheerioAPI,
  base: URL,
  type: 'internal' | 'external',
): string[] {
  const hrefs: string[] = $('a[href]')
    .map((_, el) => $(el).attr('href') ?? '')
    .get()
    .filter((href) => href.length > 0)

  const resolved = hrefs.reduce<readonly string[]>((acc, href) => {
    try {
      const url = new URL(href, base.href)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return acc

      const isInternal = url.hostname === base.hostname
      if ((type === 'internal' && isInternal) || (type === 'external' && !isInternal)) {
        return [...acc, url.href]
      }
      return acc
    } catch {
      return acc
    }
  }, [])

  return [...new Set(resolved)]
}

function extractSchemaOrg($: cheerio.CheerioAPI): unknown[] {
  return $('script[type="application/ld+json"]')
    .map((_, el) => $(el).html())
    .get()
    .filter((content): content is string => content !== null && content.length > 0)
    .reduce<unknown[]>((acc, content) => {
      try {
        return [...acc, JSON.parse(content)]
      } catch {
        return acc
      }
    }, [])
}

function countWords($: cheerio.CheerioAPI): number {
  const bodyText = $('body').text()
  return bodyText.split(/\s+/).filter((word) => word.length > 0).length
}

function metaContent(
  $: cheerio.CheerioAPI,
  property: string,
): string | null {
  return (
    $(`meta[property="${property}"]`).attr('content')?.trim() || null
  )
}

function metaName(
  $: cheerio.CheerioAPI,
  name: string,
): string | null {
  return (
    $(`meta[name="${name}"]`).attr('content')?.trim() || null
  )
}

function resolveUrl(raw: string | null, base: URL): string | null {
  if (!raw) return null
  try {
    return new URL(raw, base.href).href
  } catch {
    return null
  }
}

function parseIntOrNull(value: string | undefined): number | null {
  if (!value) return null
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? null : parsed
}
