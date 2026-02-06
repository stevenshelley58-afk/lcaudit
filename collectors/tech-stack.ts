import * as cheerio from 'cheerio'
import { fetchWithRetry } from '@/lib/utils'
import { USER_AGENT } from '@/lib/constants'
import type { TechStackData, DetectedApp, ThirdPartyScript } from '@/lib/types'

export async function collectTechStack(
  url: string,
  _auditId: string,
): Promise<TechStackData> {
  const response = await fetchWithRetry(
    async () => {
      const r = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
        redirect: 'follow',
      })
      if (!r.ok) {
        throw new Error(`Tech stack fetch failed: ${r.status}`)
      }
      return r
    },
    2,
    'tech-stack-fetch',
  )

  const headers = Object.fromEntries(response.headers.entries())
  const html = await response.text()
  const $ = cheerio.load(html)

  const platform = detectPlatform($, html, headers)
  const theme = detectTheme($, html)
  const detectedApps = detectApps($, html, headers)
  const thirdPartyScripts = detectThirdPartyScripts($, url)

  return {
    platform,
    theme,
    detectedApps,
    thirdPartyScripts,
    thirdPartyCount: thirdPartyScripts.length,
  }
}

function detectPlatform(
  $: cheerio.CheerioAPI,
  html: string,
  headers: Record<string, string>,
): string | null {
  const generator = $('meta[name="generator"]').attr('content') ?? ''

  if (generator.toLowerCase().includes('wordpress') || html.includes('wp-content')) {
    return 'WordPress'
  }
  if (html.includes('cdn.shopify.com') || html.includes('Shopify.theme')) {
    return 'Shopify'
  }
  if (html.includes('static.wixstatic.com') || html.includes('wix-bolt')) {
    return 'Wix'
  }
  if (html.includes('static.squarespace.com') || html.includes('squarespace')) {
    return 'Squarespace'
  }
  if (html.includes('__NEXT_DATA__') || html.includes('/_next/')) {
    return 'Next.js'
  }
  if (html.includes('__NUXT__') || html.includes('/_nuxt/')) {
    return 'Nuxt'
  }
  if (headers['x-powered-by']?.includes('Express')) {
    return 'Express'
  }
  if (html.includes('__gatsby')) {
    return 'Gatsby'
  }
  if (html.includes('data-drupal') || generator.toLowerCase().includes('drupal')) {
    return 'Drupal'
  }
  if (generator.toLowerCase().includes('joomla')) {
    return 'Joomla'
  }
  if (html.includes('webflow.com') || html.includes('wf-page')) {
    return 'Webflow'
  }

  return null
}

function detectTheme(
  $: cheerio.CheerioAPI,
  html: string,
): string | null {
  const themeMatch = html.match(/wp-content\/themes\/([^/]+)/)
  if (themeMatch) return themeMatch[1]

  const shopifyTheme = $('meta[name="theme-name"]').attr('content')
  if (shopifyTheme) return shopifyTheme

  return null
}

function detectApps(
  $: cheerio.CheerioAPI,
  html: string,
  headers: Record<string, string>,
): DetectedApp[] {
  return [
    ...detectAnalyticsApps(html),
    ...detectSupportApps(html),
    ...detectCommerceApps(html),
    ...detectFontApps(html),
    ...detectInfraApps(html, headers),
    ...detectFrameworkApps($, html),
  ]
}

function detectAnalyticsApps(html: string): readonly DetectedApp[] {
  const app = (name: string, category: string): DetectedApp => ({
    name,
    category,
    version: null,
  })

  return [
    ...(html.includes('google-analytics.com') || html.includes('gtag')
      ? [app('Google Analytics', 'Analytics')]
      : []),
    ...(html.includes('googletagmanager.com')
      ? [app('Google Tag Manager', 'Tag Management')]
      : []),
    ...(html.includes('connect.facebook.net') || html.includes('fbq(')
      ? [app('Meta Pixel', 'Analytics')]
      : []),
    ...(html.includes('hotjar.com') ? [app('Hotjar', 'Analytics')] : []),
    ...(html.includes('clarity.ms')
      ? [app('Microsoft Clarity', 'Analytics')]
      : []),
  ]
}

function detectSupportApps(html: string): readonly DetectedApp[] {
  const app = (name: string): DetectedApp => ({
    name,
    category: 'Customer Support',
    version: null,
  })

  return [
    ...(html.includes('intercom.com') || html.includes('Intercom(')
      ? [app('Intercom')]
      : []),
    ...(html.includes('crisp.chat') ? [app('Crisp')] : []),
    ...(html.includes('tawk.to') ? [app('Tawk.to')] : []),
    ...(html.includes('drift.com') || html.includes('Drift(')
      ? [app('Drift')]
      : []),
  ]
}

function detectCommerceApps(html: string): readonly DetectedApp[] {
  if (html.includes('cdn.shopify.com/s/files') || html.includes('shopify-buy')) {
    return [{ name: 'Shopify Buy Button', category: 'eCommerce', version: null }]
  }
  return []
}

function detectFontApps(html: string): readonly DetectedApp[] {
  return [
    ...(html.includes('fonts.googleapis.com') || html.includes('fonts.gstatic.com')
      ? [{ name: 'Google Fonts', category: 'Font', version: null }]
      : []),
    ...(html.includes('use.typekit.net')
      ? [{ name: 'Adobe Fonts', category: 'Font', version: null }]
      : []),
  ]
}

function detectInfraApps(
  html: string,
  headers: Record<string, string>,
): readonly DetectedApp[] {
  return [
    ...(headers['server']?.toLowerCase().includes('cloudflare') || html.includes('cloudflare')
      ? [{ name: 'Cloudflare', category: 'CDN', version: null }]
      : []),
    ...(html.includes('cdn.jsdelivr.net')
      ? [{ name: 'jsDelivr', category: 'CDN', version: null }]
      : []),
  ]
}

function detectFrameworkApps(
  $: cheerio.CheerioAPI,
  html: string,
): readonly DetectedApp[] {
  const reactMatch = html.match(/__REACT_DEVTOOLS_GLOBAL_HOOK__|react[-.](\d+)/)
  const hasReact = reactMatch || html.includes('__reactContainer') || $('[data-reactroot]').length > 0
  const hasVue = html.includes('Vue.js') || $('[data-v-]').length > 0
  const hasAngular = html.includes('ng-version') || $('[ng-version]').length > 0
  const ngVersion = hasAngular ? ($('[ng-version]').attr('ng-version') ?? null) : null

  return [
    ...(hasReact ? [{ name: 'React', category: 'JavaScript Framework', version: null }] : []),
    ...(hasVue ? [{ name: 'Vue.js', category: 'JavaScript Framework', version: null }] : []),
    ...(hasAngular ? [{ name: 'Angular', category: 'JavaScript Framework', version: ngVersion }] : []),
    ...(html.includes('jquery') || html.includes('jQuery')
      ? [{ name: 'jQuery', category: 'JavaScript Library', version: null }]
      : []),
    ...(html.includes('bootstrap') || $('[class*="container-fluid"]').length > 0
      ? [{ name: 'Bootstrap', category: 'CSS Framework', version: null }]
      : []),
    ...(html.includes('tailwindcss') || html.includes('tailwind')
      ? [{ name: 'Tailwind CSS', category: 'CSS Framework', version: null }]
      : []),
  ]
}

function detectThirdPartyScripts(
  $: cheerio.CheerioAPI,
  baseUrl: string,
): ThirdPartyScript[] {
  const base = new URL(baseUrl)

  const srcs: string[] = $('script[src]')
    .map((_, el) => $(el).attr('src') ?? '')
    .get()
    .filter((src) => src.length > 0)

  const { scripts } = srcs.reduce<{
    readonly scripts: readonly ThirdPartyScript[]
    readonly seenDomains: ReadonlySet<string>
  }>(
    (acc, src) => {
      try {
        const resolved = new URL(src, base.href)
        if (resolved.hostname === base.hostname) return acc

        const domain = resolved.hostname
        if (acc.seenDomains.has(domain)) return acc

        return {
          scripts: [...acc.scripts, { domain, purpose: guessScriptPurpose(domain) }],
          seenDomains: new Set([...acc.seenDomains, domain]),
        }
      } catch {
        return acc
      }
    },
    { scripts: [], seenDomains: new Set() },
  )

  return [...scripts]
}

function guessScriptPurpose(domain: string): string | null {
  const purposes: Record<string, string> = {
    'google-analytics.com': 'Analytics',
    'googletagmanager.com': 'Tag Management',
    'connect.facebook.net': 'Social / Advertising',
    'platform.twitter.com': 'Social',
    'cdn.shopify.com': 'eCommerce',
    'js.stripe.com': 'Payments',
    'cdn.jsdelivr.net': 'CDN',
    'cdnjs.cloudflare.com': 'CDN',
    'unpkg.com': 'CDN',
    'fonts.googleapis.com': 'Fonts',
    'www.googleadservices.com': 'Advertising',
    'pagead2.googlesyndication.com': 'Advertising',
    'static.hotjar.com': 'Analytics',
    'js.intercomcdn.com': 'Customer Support',
    'widget.intercom.io': 'Customer Support',
    'www.clarity.ms': 'Analytics',
    'snap.licdn.com': 'Social / Advertising',
  }

  for (const [key, purpose] of Object.entries(purposes)) {
    if (domain.includes(key)) return purpose
  }

  return null
}
