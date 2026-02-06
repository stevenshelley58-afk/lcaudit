import { put, list } from '@vercel/blob'
import { Redis } from '@upstash/redis'
import type { AuditReport, AuditHistoryEntry } from './types'

// ============================================================
// Redis Client (lazy init)
// ============================================================

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  _redis = new Redis({ url, token })
  return _redis
}

// ============================================================
// Vercel Blob Operations
// ============================================================

export async function storeScreenshot(
  auditId: string,
  viewport: 'desktop' | 'mobile',
  imageBuffer: ArrayBuffer,
): Promise<string> {
  const blob = await put(
    `audits/${auditId}/${viewport}.png`,
    new Uint8Array(imageBuffer),
    { access: 'public', contentType: 'image/png' },
  )
  return blob.url
}

export async function storeAuditReport(
  auditId: string,
  report: AuditReport,
): Promise<string> {
  const blob = await put(
    `audits/${auditId}/report.json`,
    JSON.stringify(report),
    { access: 'public', contentType: 'application/json' },
  )
  return blob.url
}

export async function getAuditReport(blobUrl: string): Promise<AuditReport> {
  const response = await fetch(blobUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch report: ${response.status}`)
  }
  return response.json() as Promise<AuditReport>
}

export async function listAuditBlobs() {
  const result = await list({ prefix: 'audits/' })
  return result.blobs
}

// ============================================================
// Redis Operations (config + history)
// ============================================================

export async function getConfig<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return null

  try {
    return await redis.get<T>(key)
  } catch {
    return null
  }
}

export async function setConfig<T>(key: string, value: T): Promise<void> {
  const redis = getRedis()
  if (!redis) {
    throw new Error('Redis not configured — set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN')
  }

  await redis.set(key, value)
}

export async function addToAuditHistory(
  entry: AuditHistoryEntry,
): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  await redis.zadd('audit:history', {
    score: Date.now(),
    member: JSON.stringify(entry),
  })
}

export async function getAuditHistory(
  limit: number = 50,
): Promise<readonly AuditHistoryEntry[]> {
  const redis = getRedis()
  if (!redis) return []

  const results = await redis.zrange('audit:history', 0, limit - 1, {
    rev: true,
  })

  return results.map((r) =>
    typeof r === 'string' ? JSON.parse(r) : r,
  ) as readonly AuditHistoryEntry[]
}
