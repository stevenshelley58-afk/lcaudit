import { withTimeout } from '@/lib/utils'
import { AuditError } from '@/lib/errors'
import { COLLECTOR_TIMEOUT_MS } from '@/lib/constants'
import type {
  CollectedData,
  ScreenshotData,
  LighthouseData,
  HtmlData,
  RobotsData,
  SitemapData,
  SslDnsData,
  SecurityHeadersData,
  SerpData,
  LinkCheckData,
  TechStackData,
} from '@/lib/types'
import { collectScreenshots } from './screenshots'
import { collectLighthouse } from './lighthouse'
import { collectHtml } from './html-extract'
import { collectRobots } from './robots'
import { collectSitemap } from './sitemap'
import { collectSslDns } from './ssl-dns'
import { collectSecurityHeaders } from './security-headers'
import { collectSerp } from './serp'
import { collectLinkCheck } from './link-check'
import { collectTechStack } from './tech-stack'

interface CollectorDef<T> {
  readonly name: string
  readonly tier: 'required' | 'optional'
  readonly fn: (url: string, auditId: string) => Promise<T>
}

const REQUIRED_COLLECTORS: readonly [
  CollectorDef<ScreenshotData>,
  CollectorDef<LighthouseData>,
  CollectorDef<HtmlData>,
] = [
  { name: 'screenshots', tier: 'required', fn: collectScreenshots },
  { name: 'lighthouse', tier: 'required', fn: collectLighthouse },
  { name: 'html', tier: 'required', fn: collectHtml },
]

const OPTIONAL_COLLECTORS: readonly [
  CollectorDef<RobotsData>,
  CollectorDef<SitemapData>,
  CollectorDef<SslDnsData>,
  CollectorDef<SecurityHeadersData>,
  CollectorDef<SerpData>,
  CollectorDef<LinkCheckData>,
  CollectorDef<TechStackData>,
] = [
  { name: 'robots', tier: 'optional', fn: collectRobots },
  { name: 'sitemap', tier: 'optional', fn: collectSitemap },
  { name: 'sslDns', tier: 'optional', fn: collectSslDns },
  { name: 'securityHeaders', tier: 'optional', fn: collectSecurityHeaders },
  { name: 'serp', tier: 'optional', fn: collectSerp },
  { name: 'linkCheck', tier: 'optional', fn: collectLinkCheck },
  { name: 'techStack', tier: 'optional', fn: collectTechStack },
]

export interface CollectorTiming {
  readonly name: string
  readonly durationMs: number
  readonly status: 'ok' | 'failed'
}

export interface StartedCollectors {
  /** Resolves when screenshots collector completes */
  readonly screenshots: Promise<ScreenshotData>
  /** Resolves when html-extract collector completes */
  readonly html: Promise<HtmlData>
  /** Resolves to the full CollectedData once all 10 collectors finish */
  readonly waitForAll: () => Promise<CollectedData>
  /** Per-collector timing (populated after waitForAll resolves) */
  readonly timings: CollectorTiming[]
}

/**
 * Kick off all 10 collectors in parallel, but expose individual promises
 * for screenshots and html so callers can start the visual analyser early.
 */
export function startCollectors(url: string, auditId: string): StartedCollectors {
  const waveStart = Date.now()
  const timings: CollectorTiming[] = []

  const allCollectors: readonly CollectorDef<unknown>[] = [
    ...REQUIRED_COLLECTORS,
    ...OPTIONAL_COLLECTORS,
  ]

  // Fire all 10 collectors immediately — each gets its own promise
  const promises = allCollectors.map(async (c) => {
    const t0 = Date.now()
    try {
      const result = await withTimeout(c.fn(url, auditId), COLLECTOR_TIMEOUT_MS, c.name)
      const ms = Date.now() - t0
      timings.push({ name: c.name, durationMs: ms, status: 'ok' })
      console.log(`[collector] ${c.name} OK in ${ms}ms`)
      return result
    } catch (err) {
      const ms = Date.now() - t0
      timings.push({ name: c.name, durationMs: ms, status: 'failed' })
      console.log(`[collector] ${c.name} FAILED in ${ms}ms: ${(err as Error).message}`)
      throw err
    }
  })

  // Prevent unhandled rejection warnings — waitForAll() uses Promise.allSettled
  // to observe the real rejection status, but individual promises in the array
  // need a no-op handler in case waitForAll() is never called (e.g. early abort)
  promises.forEach((p) => p.catch(() => {}))

  // Build a name → promise lookup so we don't depend on array order
  const promiseByName = new Map(
    allCollectors.map((c, i) => [c.name, promises[i]]),
  )

  const screenshotsPromise = promiseByName.get('screenshots')!.then((v) => v as ScreenshotData)
  const htmlPromise = promiseByName.get('html')!.then((v) => v as HtmlData)

  const waitForAll = async (): Promise<CollectedData> => {
    const results = await Promise.allSettled(promises)

    console.log(`[pipeline] Wave 1 (collectors) done in ${Date.now() - waveStart}ms`)

    // Check required collectors (indices 0, 1, 2)
    const failedRequired = REQUIRED_COLLECTORS.reduce<readonly string[]>(
      (acc, collector, i) => {
        const result = results[i]
        if (result.status === 'rejected') {
          return [...acc, `${collector.name}: ${(result.reason as Error).message}`]
        }
        return acc
      },
      [],
    )

    if (failedRequired.length > 0) {
      throw new AuditError(
        `Required collectors failed: ${failedRequired.join('; ')}`,
        failedRequired.map((f) => f.split(':')[0]),
      )
    }

    const reqOffset = REQUIRED_COLLECTORS.length

    function getOptionalValue<T>(index: number): T | null {
      const result = results[reqOffset + index]
      return result.status === 'fulfilled' ? (result.value as T) : null
    }

    return {
      screenshots: (results[0] as PromiseFulfilledResult<ScreenshotData>).value,
      lighthouse: (results[1] as PromiseFulfilledResult<LighthouseData>).value,
      html: (results[2] as PromiseFulfilledResult<HtmlData>).value,
      robots: getOptionalValue<RobotsData>(0),
      sitemap: getOptionalValue<SitemapData>(1),
      sslDns: getOptionalValue<SslDnsData>(2),
      securityHeaders: getOptionalValue<SecurityHeadersData>(3),
      serp: getOptionalValue<SerpData>(4),
      linkCheck: getOptionalValue<LinkCheckData>(5),
      techStack: getOptionalValue<TechStackData>(6),
    }
  }

  return {
    screenshots: screenshotsPromise,
    html: htmlPromise,
    waitForAll,
    timings,
  }
}

/** Backwards-compatible wrapper — collects all data and returns when complete */
export async function collectAll(
  url: string,
  auditId: string,
): Promise<CollectedData> {
  return startCollectors(url, auditId).waitForAll()
}
