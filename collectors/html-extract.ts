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
      image: metaContent($, 'og:image'),
      type: metaContent($, 'og:type'),
      url: metaContent($, 'og:url'),
    },
    twitterCard: {
      card: metaName($, 'twitter:card'),
      title: metaName($, 'twitter:title'),
      description: metaName($, 'twitter:description'),
      image: metaName($, 'twitter:image'),
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
  const links: string[] = []

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return

    try {
      const resolved = new URL(href, base.href)
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
        return
      }

      const isInternal = resolved.hostname === base.hostname
      if ((type === 'internal' && isInternal) || (type === 'external' && !isInternal)) {
        links.push(resolved.href)
      }
    } catch {
      // Skip malformed URLs
    }
  })

  return [...new Set(links)]
}

function extractSchemaOrg($: cheerio.CheerioAPI): unknown[] {
  const schemas: unknown[] = []

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html()
      if (content) {
        schemas.push(JSON.parse(content))
      }
    } catch {
      // Skip invalid JSON-LD
    }
  })

  return schemas
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

function parseIntOrNull(value: string | undefined): number | null {
  if (!value) return null
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? null : parsed
}
