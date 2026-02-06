export const COLLECTOR_TIMEOUT_MS = 120_000

export const AI_TIMEOUT_MS = 120_000

export const AUDIT_MAX_DURATION_MS = 120_000

export const RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60_000,
} as const

export const SCREENSHOT_CONFIG = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const

export const PAGESPEED_API_URL =
  'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

export const GOOGLE_CSE_API_URL =
  'https://www.googleapis.com/customsearch/v1'

export const SCREENSHOTONE_API_URL =
  'https://api.screenshotone.com/take'

export const PRIVATE_IP_PATTERNS: readonly RegExp[] = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^localhost$/i,
]

export const SECURITY_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
] as const

export const USER_AGENT = 'Mozilla/5.0 (compatible; LcauditBot/1.0)'

export const MAX_INTERNAL_LINKS_TO_CHECK = 50
