import { NextResponse } from 'next/server'
import { z } from 'zod'
import { collectAll } from '@/collectors'
import { getEnv } from '@/lib/env'
import { validateAuditUrl } from '@/lib/url-safety'
import { checkRateLimit, generateAuditId, extractHostname } from '@/lib/utils'
import { ApiError, AuditError } from '@/lib/errors'
import type { ApiResponse } from '@/lib/types'

const AuditRequestSchema = z.object({
  url: z.string().min(1, 'URL is required'),
})

export async function POST(request: Request): Promise<Response> {
  try {
    // Validate env vars on first call (fail fast)
    getEnv()

    // Rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please wait a moment and try again.',
        } satisfies ApiResponse<never>,
        { status: 429 },
      )
    }

    // Parse and validate input
    const body = await request.json()
    const { url: rawUrl } = AuditRequestSchema.parse(body)

    // Normalise URL (add https:// if missing)
    let url = rawUrl.trim()
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`
    }

    // SSRF prevention
    validateAuditUrl(url)

    // Run audit (Phase 1: collectors only)
    const auditId = generateAuditId()
    const startTime = Date.now()
    const collectedData = await collectAll(url, auditId)
    const durationMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        auditId,
        url,
        hostname: extractHostname(url),
        durationMs,
        collectedData,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}

function handleError(error: unknown): Response {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: error.message } satisfies ApiResponse<never>,
      { status: error.statusCode },
    )
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: error.errors,
      } satisfies ApiResponse<never>,
      { status: 400 },
    )
  }

  if (error instanceof AuditError) {
    return NextResponse.json(
      { success: false, error: error.message } satisfies ApiResponse<never>,
      { status: 502 },
    )
  }

  // Unknown error — don't leak internals
  console.error('Unexpected audit error:', error)
  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    } satisfies ApiResponse<never>,
    { status: 500 },
  )
}
