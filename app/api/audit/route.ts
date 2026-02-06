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
import type { AuditPage, AuditReport, ApiResponse } from '@/lib/types'

// Legacy schema for backwards compatibility: { url: string }
const LegacyRequestSchema = z.object({
  url: z.string().min(1, 'URL is required'),
})

function normaliseUrl(raw: string): string {
  let url = raw.trim()
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  return url
}

async function runPipeline(page: AuditPage): Promise<AuditReport> {
  const url = normaliseUrl(page.url)
  validateAuditUrl(url)

  const auditId = generateAuditId()
  const hostname = extractHostname(url)
  const startTime = Date.now()

  // Wave 1: Collect data (10 parallel collectors)
  const collectedData = await collectAll(url, auditId)

  // Wave 2: Run AI analysers (8 parallel analysers)
  const analyses = await runAllAnalysers(collectedData)

  // Wave 3: Build final report (synthesis + persistence)
  const durationMs = Date.now() - startTime
  return buildReport({
    auditId,
    url,
    hostname,
    pageLabel: page.label,
    collectedData,
    analyses,
    durationMs,
  })
}

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

    // Parse input — support both new { pages } and legacy { url } format
    const body = await request.json()

    let pages: readonly AuditPage[]

    const newFormat = AuditRequestSchema.safeParse(body)
    if (newFormat.success) {
      pages = newFormat.data.pages
    } else {
      const legacy = LegacyRequestSchema.parse(body)
      pages = [{ url: legacy.url, label: 'homepage' }]
    }

    // Run all page pipelines in parallel
    const results = await Promise.allSettled(pages.map(runPipeline))

    const reports: AuditReport[] = []
    const errors: string[] = []

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'fulfilled') {
        reports.push(result.value)
      } else {
        const label = pages[i].label
        const message = result.reason instanceof Error
          ? result.reason.message
          : 'Unknown error'
        errors.push(`${label}: ${message}`)
      }
    }

    // If all pipelines failed, return error
    if (reports.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'All audit pipelines failed.',
          details: { errors },
        } satisfies ApiResponse<never>,
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        reports,
        ...(errors.length > 0 ? { errors } : {}),
      },
    })
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
