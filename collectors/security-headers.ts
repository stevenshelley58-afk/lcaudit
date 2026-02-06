import { SECURITY_HEADERS, USER_AGENT } from '@/lib/constants'
import type { SecurityHeadersData } from '@/lib/types'

export async function collectSecurityHeaders(
  url: string,
  _auditId: string,
): Promise<SecurityHeadersData> {
  const response = await fetch(url, {
    method: 'HEAD',
    redirect: 'follow',
    headers: { 'User-Agent': USER_AGENT },
  })

  const headers: Record<string, string | null> = {}
  const missingHeaders: string[] = []

  for (const header of SECURITY_HEADERS) {
    const value = response.headers.get(header)
    headers[header] = value
    if (!value) {
      missingHeaders.push(header)
    }
  }

  return {
    headers,
    missingHeaders,
    grade: calculateGrade(missingHeaders.length),
  }
}

function calculateGrade(missingCount: number): string {
  if (missingCount === 0) return 'A'
  if (missingCount <= 1) return 'B'
  if (missingCount <= 2) return 'C'
  if (missingCount <= 4) return 'D'
  return 'F'
}
