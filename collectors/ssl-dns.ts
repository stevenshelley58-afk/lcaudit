import { USER_AGENT } from '@/lib/constants'
import type { SslDnsData, RedirectHop } from '@/lib/types'

const MAX_REDIRECTS = 10

export async function collectSslDns(
  url: string,
  _auditId: string,
): Promise<SslDnsData> {
  const parsed = new URL(url)
  const isHttps = parsed.protocol === 'https:'

  // Trace redirect chain from HTTP version
  const httpUrl = `http://${parsed.hostname}${parsed.pathname}`
  const redirectChain = await traceRedirects(httpUrl)

  return {
    isHttps,
    certIssuer: null,  // Not available in serverless fetch — best effort
    certExpiry: null,   // Not available in serverless fetch — best effort
    protocol: isHttps ? 'https' : 'http',
    redirectChain,
  }
}

async function traceRedirects(url: string): Promise<readonly RedirectHop[]> {
  let chain: readonly RedirectHop[] = []
  let currentUrl = url

  for (let i = 0; i < MAX_REDIRECTS; i++) {
    try {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        headers: { 'User-Agent': USER_AGENT },
      })

      chain = [...chain, { url: currentUrl, statusCode: response.status }]

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) break

        try {
          currentUrl = new URL(location, currentUrl).href
        } catch {
          break
        }
      } else {
        break
      }
    } catch {
      break
    }
  }

  return chain
}
