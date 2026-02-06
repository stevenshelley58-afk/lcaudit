import { PRIVATE_IP_PATTERNS } from './constants'
import { ApiError } from './errors'

export function validateAuditUrl(rawUrl: string): URL {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new ApiError(400, 'Invalid URL format')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ApiError(400, 'Only HTTP and HTTPS URLs are supported')
  }

  const { hostname } = parsed

  if (!hostname || hostname.length === 0) {
    throw new ApiError(400, 'URL must have a valid hostname')
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new ApiError(400, 'Internal or private URLs are not permitted')
    }
  }

  return parsed
}

export function normaliseUrl(rawUrl: string): string {
  let url = rawUrl.trim()

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }

  const parsed = validateAuditUrl(url)
  return parsed.href
}
