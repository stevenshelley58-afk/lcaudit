import { TimeoutError } from './errors'
import { RATE_LIMIT } from './constants'

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new TimeoutError(label, timeoutMs)),
      timeoutMs,
    )
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timeoutId!)
  }
}

export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  label: string = 'operation',
): Promise<T> {
  let lastError: Error = new Error(`${label} failed`)

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries - 1) {
        const delayMs = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  throw lastError
}

const limiter = new Map<string, readonly number[]>()

export function checkRateLimit(ip: string): boolean {
  const now = Date.now()

  // Prune stale IPs to prevent unbounded memory growth
  for (const [key, timestamps] of limiter) {
    const active = timestamps.filter((t) => now - t < RATE_LIMIT.windowMs)
    if (active.length === 0) {
      limiter.delete(key)
    } else if (active.length !== timestamps.length) {
      limiter.set(key, active)
    }
  }

  const existing = limiter.get(ip) ?? []
  const recent = existing.filter((t) => now - t < RATE_LIMIT.windowMs)

  if (recent.length >= RATE_LIMIT.maxRequests) {
    return false
  }

  limiter.set(ip, [...recent, now])
  return true
}

export function generateAuditId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `audit_${timestamp}_${random}`
}

export function extractHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
