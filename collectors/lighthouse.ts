import { getPageSpeedKey } from '@/lib/env'
import { fetchWithRetry } from '@/lib/utils'
import { PAGESPEED_API_URL } from '@/lib/constants'
import type { LighthouseData, LighthouseScores, LighthouseDiagnostic } from '@/lib/types'

interface PageSpeedResponse {
  readonly lighthouseResult: {
    readonly categories: Record<string, { readonly score: number | null }>
    readonly audits: Record<
      string,
      { readonly numericValue?: number; readonly title?: string; readonly description?: string; readonly score?: number | null }
    >
  }
}

export async function collectLighthouse(
  url: string,
  _auditId: string,
): Promise<LighthouseData> {
  const apiKey = getPageSpeedKey()

  const [mobileRaw, desktopRaw] = await Promise.all([
    runPageSpeedInsights(url, 'MOBILE', apiKey),
    runPageSpeedInsights(url, 'DESKTOP', apiKey),
  ])

  return {
    mobile: extractScores(mobileRaw),
    desktop: extractScores(desktopRaw),
    diagnostics: extractDiagnostics(mobileRaw),
  }
}

async function runPageSpeedInsights(
  url: string,
  strategy: 'MOBILE' | 'DESKTOP',
  apiKey: string,
): Promise<PageSpeedResponse> {
  const categories = ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO']
  const categoryParams = categories.map((c) => `category=${c}`).join('&')

  const requestUrl =
    `${PAGESPEED_API_URL}?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=${strategy}&${categoryParams}`

  return fetchWithRetry(
    async () => {
      const response = await fetch(requestUrl)

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new Error(
          `PageSpeed Insights error ${response.status}: ${body || response.statusText}`,
        )
      }

      return response.json() as Promise<PageSpeedResponse>
    },
    2,
    `pagespeed-${strategy.toLowerCase()}`,
  )
}

function extractScores(data: PageSpeedResponse): LighthouseScores {
  const { categories, audits } = data.lighthouseResult

  return {
    performance: Math.round((categories.performance?.score ?? 0) * 100),
    accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round(
      (categories['best-practices']?.score ?? 0) * 100,
    ),
    seo: Math.round((categories.seo?.score ?? 0) * 100),
    lcp: audits['largest-contentful-paint']?.numericValue ?? 0,
    cls: audits['cumulative-layout-shift']?.numericValue ?? 0,
    tbt: audits['total-blocking-time']?.numericValue ?? 0,
    fcp: audits['first-contentful-paint']?.numericValue ?? 0,
    si: audits['speed-index']?.numericValue ?? 0,
    tti: audits['interactive']?.numericValue ?? 0,
  }
}

function extractDiagnostics(
  data: PageSpeedResponse,
): LighthouseDiagnostic[] {
  const { audits } = data.lighthouseResult
  const diagnosticKeys = [
    'render-blocking-resources',
    'uses-optimized-images',
    'uses-responsive-images',
    'unminified-css',
    'unminified-javascript',
    'unused-css-rules',
    'unused-javascript',
    'efficient-animated-content',
    'duplicated-javascript',
    'legacy-javascript',
    'dom-size',
    'critical-request-chains',
    'redirects',
    'uses-rel-preconnect',
    'server-response-time',
    'bootup-time',
    'mainthread-work-breakdown',
    'font-display',
    'third-party-summary',
  ]

  return diagnosticKeys
    .filter((key) => audits[key])
    .map((key) => ({
      title: audits[key].title ?? key,
      description: audits[key].description ?? '',
      score: audits[key].score ?? null,
    }))
}
