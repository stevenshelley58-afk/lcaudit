import { NextResponse } from 'next/server'
import { z } from 'zod'
import { collectAll } from '@/collectors'
import { runAllAnalysers } from '@/analysers'
import { synthesize } from '@/synthesis/synthesize'
import { getEnv } from '@/lib/env'
import { validateAuditUrl } from '@/lib/url-safety'
import { checkRateLimit, generateAuditId, extractHostname } from '@/lib/utils'
import { ApiError, AuditError } from '@/lib/errors'
import { AuditRequestSchema } from '@/lib/types'
import type { ApiResponse } from '@/lib/types'

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

    // Run audit pipeline
    const auditId = generateAuditId()
    const hostname = extractHostname(url)
    const startTime = Date.now()

    // Wave 1: Collect data (10 parallel collectors)
    const collectedData = await collectAll(url, auditId)

    // Wave 2: Run AI analysers (8 parallel analysers)
    const analyses = await runAllAnalysers(collectedData)

    // Wave 3: Synthesize final report
    const durationMs = Date.now() - startTime
    const report = await synthesize(
      url,
      hostname,
      collectedData,
      analyses,
      auditId,
      durationMs,
    )

    return NextResponse.json({
      success: true,
      data: report,
    } satisfies ApiResponse<typeof report>)
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
  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    } satisfies ApiResponse<never>,
    { status: 500 },
  )
}
