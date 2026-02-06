import { fetchWithRetry } from '@/lib/utils'
import { SECURITY_HEADERS, USER_AGENT } from '@/lib/constants'
import type { SecurityHeadersData } from '@/lib/types'

export async function collectSecurityHeaders(
  url: string,
  _auditId: string,
): Promise<SecurityHeadersData> {
  const response = await fetchWithRetry(
    async () => {
      const r = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT },
      })
      if (!r.ok) {
        throw new Error(`Security headers fetch failed: ${r.status}`)
      }
      return r
    },
    2,
    'security-headers-fetch',
  )

  const headerResults = SECURITY_HEADERS.reduce<{
    readonly headers: Record<string, string | null>
    readonly missingHeaders: readonly string[]
  }>(
    (acc, header) => {
      const value = response.headers.get(header)
      return {
        headers: { ...acc.headers, [header]: value },
        missingHeaders: value ? acc.missingHeaders : [...acc.missingHeaders, header],
      }
    },
    { headers: {}, missingHeaders: [] },
  )

  return {
    headers: headerResults.headers,
    missingHeaders: [...headerResults.missingHeaders],
    grade: calculateGrade(headerResults.missingHeaders.length),
  }
}

function calculateGrade(missingCount: number): string {
  if (missingCount === 0) return 'A'
  if (missingCount <= 1) return 'B'
  if (missingCount <= 2) return 'C'
  if (missingCount <= 4) return 'D'
  return 'F'
}
