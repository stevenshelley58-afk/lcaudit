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
  // WordPress theme detection
  const themeMatch = html.match(/wp-content\/themes\/([^/]+)/)
  if (themeMatch) return themeMatch[1]

  // Shopify theme
  const shopifyTheme = $('meta[name="theme-name"]').attr('content')
  if (shopifyTheme) return shopifyTheme

  return null
}

function detectApps(
  $: cheerio.CheerioAPI,
  html: string,
  headers: Record<string, string>,
): DetectedApp[] {
  const apps: DetectedApp[] = []

  // Analytics
  if (html.includes('google-analytics.com') || html.includes('gtag')) {
    apps.push({ name: 'Google Analytics', category: 'Analytics', version: null })
  }
  if (html.includes('googletagmanager.com')) {
    apps.push({ name: 'Google Tag Manager', category: 'Tag Management', version: null })
  }
  if (html.includes('connect.facebook.net') || html.includes('fbq(')) {
    apps.push({ name: 'Meta Pixel', category: 'Analytics', version: null })
  }
  if (html.includes('hotjar.com')) {
    apps.push({ name: 'Hotjar', category: 'Analytics', version: null })
  }
  if (html.includes('clarity.ms')) {
    apps.push({ name: 'Microsoft Clarity', category: 'Analytics', version: null })
  }

  // Chat / Support
  if (html.includes('intercom.com') || html.includes('Intercom(')) {
    apps.push({ name: 'Intercom', category: 'Customer Support', version: null })
  }
  if (html.includes('crisp.chat')) {
    apps.push({ name: 'Crisp', category: 'Customer Support', version: null })
  }
  if (html.includes('tawk.to')) {
    apps.push({ name: 'Tawk.to', category: 'Customer Support', version: null })
  }
  if (html.includes('drift.com') || html.includes('Drift(')) {
    apps.push({ name: 'Drift', category: 'Customer Support', version: null })
  }

  // CMS / eCommerce
  if (html.includes('cdn.shopify.com/s/files') || html.includes('shopify-buy')) {
    apps.push({ name: 'Shopify Buy Button', category: 'eCommerce', version: null })
  }

  // Fonts
  if (html.includes('fonts.googleapis.com') || html.includes('fonts.gstatic.com')) {
    apps.push({ name: 'Google Fonts', category: 'Font', version: null })
  }
  if (html.includes('use.typekit.net')) {
    apps.push({ name: 'Adobe Fonts', category: 'Font', version: null })
  }

  // Security / Performance
  if (headers['server']?.toLowerCase().includes('cloudflare') || html.includes('cloudflare')) {
    apps.push({ name: 'Cloudflare', category: 'CDN', version: null })
  }
  if (html.includes('cdn.jsdelivr.net')) {
    apps.push({ name: 'jsDelivr', category: 'CDN', version: null })
  }

  // Frameworks
  const reactMatch = html.match(/__REACT_DEVTOOLS_GLOBAL_HOOK__|react[-.](\d+)/)
  if (reactMatch || html.includes('__reactContainer') || $('[data-reactroot]').length > 0) {
    apps.push({ name: 'React', category: 'JavaScript Framework', version: null })
  }
  if (html.includes('Vue.js') || $('[data-v-]').length > 0) {
    apps.push({ name: 'Vue.js', category: 'JavaScript Framework', version: null })
  }
  if (html.includes('ng-version') || $('[ng-version]').length > 0) {
    const ngVersion = $('[ng-version]').attr('ng-version') ?? null
    apps.push({ name: 'Angular', category: 'JavaScript Framework', version: ngVersion })
  }

  // jQuery
  if (html.includes('jquery') || html.includes('jQuery')) {
    apps.push({ name: 'jQuery', category: 'JavaScript Library', version: null })
  }

  // Bootstrap
  if (html.includes('bootstrap') || $('[class*="container-fluid"]').length > 0) {
    apps.push({ name: 'Bootstrap', category: 'CSS Framework', version: null })
  }
  if (html.includes('tailwindcss') || html.includes('tailwind')) {
    apps.push({ name: 'Tailwind CSS', category: 'CSS Framework', version: null })
  }

  return apps
}

function detectThirdPartyScripts(
  $: cheerio.CheerioAPI,
  baseUrl: string,
): ThirdPartyScript[] {
  const base = new URL(baseUrl)
  const scripts: ThirdPartyScript[] = []
  const seenDomains = new Set<string>()

  $('script[src]').each((_, el) => {
    const src = $(el).attr('src')
    if (!src) return

    try {
      const resolved = new URL(src, base.href)
      if (resolved.hostname !== base.hostname) {
        const domain = resolved.hostname
        if (!seenDomains.has(domain)) {
          seenDomains.add(domain)
          scripts.push({
            domain,
            purpose: guessScriptPurpose(domain),
          })
        }
      }
    } catch {
      // Skip malformed URLs
    }
  })

  return scripts
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
