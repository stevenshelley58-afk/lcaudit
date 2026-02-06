import { NextResponse } from 'next/server'
import { z } from 'zod'
import { collectAll } from '@/collectors'
import { runAllAnalysers } from '@/analysers'
import { buildReport } from '@/lib/report-builder'
import { getEnv } from '@/lib/env'
import { validateAuditUrl } from '@/lib/url-safety'
import { checkRateLimit, generateAuditId, extractHostname } from '@/lib/utils'
import { ApiError, AuditError, AnalyserError, CollectorError, TimeoutError } from '@/lib/errors'
import { AuditRequestSchema } from '@/lib/types'
import type { ApiResponse } from '@/lib/types'

// Allow up to 300s on Pro plan (capped at 60s on Hobby)
export const maxDuration = 300

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

    // Wave 3: Build final report (synthesis + persistence)
    const durationMs = Date.now() - startTime
    const report = await buildReport({
      auditId,
      url,
      hostname,
      collectedData,
      analyses,
      durationMs,
    })

    return NextResponse.json({
      success: true,
      data: report,
    } satisfies ApiResponse<typeof report>)
  } catch (error) {
    return handleError(error)
  }
}

function errorDetails(error: unknown): unknown {
  const base: Record<string, unknown> = {
    stack: error instanceof Error ? error.stack : undefined,
    name: error instanceof Error ? error.name : typeof error,
  }

  if (error instanceof AuditError) {
    base.failedCollectors = error.failedCollectors
  }

  if (error instanceof AnalyserError) {
    base.analyser = error.analyser
    base.model = error.model
  }

  if (error instanceof CollectorError) {
    base.collector = error.collector
    base.tier = error.tier
  }

  if (error instanceof TimeoutError) {
    base.label = error.label
    base.timeoutMs = error.timeoutMs
  }

  if (error instanceof Error && error.cause) {
    base.cause = error.cause instanceof Error
      ? { message: error.cause.message, stack: error.cause.stack }
      : error.cause
  }

  return base
}

function handleError(error: unknown): Response {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: errorDetails(error),
      } satisfies ApiResponse<never>,
      { status: error.statusCode },
    )
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: { zodErrors: error.errors, stack: error.stack },
      } satisfies ApiResponse<never>,
      { status: 400 },
    )
  }

  if (error instanceof AuditError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: errorDetails(error),
      } satisfies ApiResponse<never>,
      { status: 502 },
    )
  }

  // Unknown error — always surface message + details for debugging
  const message = error instanceof Error
    ? error.message
    : 'An unexpected error occurred. Please try again.'

  return NextResponse.json(
    {
      success: false,
      error: message,
      details: errorDetails(error),
    } satisfies ApiResponse<never>,
    { status: 500 },
  )
}
