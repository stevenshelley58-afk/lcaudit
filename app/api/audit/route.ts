import { NextResponse } from 'next/server'
import { z } from 'zod'
import { startCollectors } from '@/collectors'
import { analyseVisual, runRemainingAnalysers, makeErrorResult } from '@/analysers'
import { buildReport } from '@/lib/report-builder'
import { getEnv } from '@/lib/env'
import { validateAuditUrl } from '@/lib/url-safety'
import { checkRateLimit, generateAuditId, extractHostname } from '@/lib/utils'
import { ApiError, AuditError, AnalyserError, CollectorError, TimeoutError } from '@/lib/errors'
import { AuditRequestSchema } from '@/lib/types'
import type { ApiResponse, CollectedData, AnalysisResult } from '@/lib/types'

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
    console.log(`[pipeline] Starting audit for ${hostname} (${url})`)

    // Wave 1: Fire all 10 collectors in parallel
    const collectors = startCollectors(url, auditId)

    // Early start: as soon as screenshots + html resolve, fire visual analyser
    const [screenshots, html] = await Promise.all([
      collectors.screenshots,
      collectors.html,
    ])
    const earlyDepsMs = Date.now() - startTime
    console.log(`[pipeline] Screenshots + HTML ready in ${earlyDepsMs}ms — starting visual analyser early`)

    // Build partial CollectedData for the visual analyser (null out fields it doesn't use)
    const partialData: CollectedData = {
      screenshots,
      lighthouse: { mobile: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0, lcp: 0, cls: 0, tbt: 0, fcp: 0, si: 0, tti: 0 }, desktop: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0, lcp: 0, cls: 0, tbt: 0, fcp: 0, si: 0, tti: 0 }, diagnostics: [] },
      html,
      robots: null,
      sitemap: null,
      sslDns: null,
      securityHeaders: null,
      serp: null,
      linkCheck: null,
      techStack: null,
    }

    // Fire visual analyser immediately (runs concurrently with remaining collectors)
    const visualStart = Date.now()
    const visualPromise: Promise<AnalysisResult> = analyseVisual(partialData).catch((err) => {
      console.log(`[analyser] Visual & Design FAILED: ${(err as Error).message}`)
      return makeErrorResult('Visual & Design', err as Error)
    })

    // Wait for all 10 collectors to finish
    const collectedData = await collectors.waitForAll()
    const collectorsMs = Date.now() - startTime
    console.log(`[pipeline] All collectors done in ${collectorsMs}ms`)

    // Wave 2: Run remaining 7 analysers with full data
    const wave2Start = Date.now()
    const [visualResult, remainingBatch] = await Promise.all([
      visualPromise,
      runRemainingAnalysers(collectedData),
    ])
    const wave2Ms = Date.now() - wave2Start
    const visualMs = Date.now() - visualStart
    console.log(`[pipeline] Visual analyser done in ${visualMs}ms`)
    console.log(`[pipeline] Wave 2 remaining analysers done in ${wave2Ms}ms`)

    // Combine: visual first (matches original ANALYSERS order), then remaining 7
    const analyses: readonly AnalysisResult[] = [visualResult, ...remainingBatch.results]

    // Wave 3: Build final report (synthesis + persistence)
    const t3 = Date.now()
    const durationMs = Date.now() - startTime
    const report = await buildReport({
      auditId,
      url,
      hostname,
      collectedData,
      analyses,
      durationMs,
    })
    const wave3Ms = Date.now() - t3
    const totalMs = Date.now() - startTime
    console.log(`[pipeline] Wave 3 (synthesis + report) done in ${wave3Ms}ms`)
    console.log(`[pipeline] Total audit: ${totalMs}ms`)

    return NextResponse.json({
      success: true,
      data: report,
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
