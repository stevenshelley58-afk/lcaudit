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

export async function collectAll(
  url: string,
  auditId: string,
): Promise<CollectedData> {
  const allCollectors = [...REQUIRED_COLLECTORS, ...OPTIONAL_COLLECTORS]

  const results = await Promise.allSettled(
    allCollectors.map((c) =>
      withTimeout(c.fn(url, auditId), COLLECTOR_TIMEOUT_MS, c.name),
    ),
  )

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

  // At this point, all required collectors succeeded
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
