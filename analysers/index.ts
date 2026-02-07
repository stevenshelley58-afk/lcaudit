import { withTimeout } from '@/lib/utils'
import { AI_TIMEOUT_MS } from '@/lib/constants'
import type { CollectedData, AnalysisResult } from '@/lib/types'
import { analyseVisual } from './visual'
import { analysePerformance } from './performance'
import { analyseSeo } from './seo'
import { analyseAccessibility } from './accessibility'
import { analyseSecurity } from './security'
import { analyseSocial } from './social'
import { analyseTechStack } from './tech-stack'
import { analyseContent } from './content'

export { analyseVisual } from './visual'

interface AnalyserDef {
  readonly name: string
  readonly fn: (data: CollectedData, hostname: string) => Promise<AnalysisResult>
}

const ALL_ANALYSERS: readonly AnalyserDef[] = [
  { name: 'Visual & Design', fn: analyseVisual },
  { name: 'Performance & Speed', fn: analysePerformance },
  { name: 'SEO & Keywords', fn: analyseSeo },
  { name: 'Accessibility', fn: analyseAccessibility },
  { name: 'Security & Trust', fn: analyseSecurity },
  { name: 'Social & Sharing', fn: analyseSocial },
  { name: 'Tech Stack & Apps', fn: analyseTechStack },
  { name: 'Content & Conversion', fn: analyseContent },
]

/** The 7 analysers that need full CollectedData (everything except visual) */
const REMAINING_ANALYSERS: readonly AnalyserDef[] = ALL_ANALYSERS.filter(
  (a) => a.name !== 'Visual & Design',
)

export interface AnalyserTiming {
  readonly name: string
  readonly durationMs: number
  readonly status: 'ok' | 'failed'
}

export interface AnalyserBatchResult {
  readonly results: readonly AnalysisResult[]
  readonly timings: readonly AnalyserTiming[]
}

export function makeErrorResult(name: string, error: Error): AnalysisResult {
  return {
    sectionTitle: name,
    eli5Summary: `Analysis unavailable. ${error.message}`,
    whyItMatters: 'This section could not be analysed due to an error.',
    overallRating: 'Error',
    score: 0,
    findings: [],
  }
}

async function runAnalyserBatch(
  analysers: readonly AnalyserDef[],
  data: CollectedData,
  hostname: string,
  label: string,
): Promise<AnalyserBatchResult> {
  const waveStart = Date.now()
  const timings: AnalyserTiming[] = []

  const results = await Promise.allSettled(
    analysers.map(async (a) => {
      const t0 = Date.now()
      try {
        const result = await withTimeout(a.fn(data, hostname), AI_TIMEOUT_MS, a.name)
        const ms = Date.now() - t0
        timings.push({ name: a.name, durationMs: ms, status: 'ok' })
        console.log(`[analyser] ${a.name} OK in ${ms}ms`)
        return result
      } catch (err) {
        const ms = Date.now() - t0
        timings.push({ name: a.name, durationMs: ms, status: 'failed' })
        console.log(`[analyser] ${a.name} FAILED in ${ms}ms: ${(err as Error).message}`)
        throw err
      }
    }),
  )

  console.log(`[pipeline] ${label} done in ${Date.now() - waveStart}ms`)

  const analysisResults = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    return makeErrorResult(
      analysers[index].name,
      result.reason as Error,
    )
  })

  return { results: analysisResults, timings }
}

/** Run all 8 analysers in parallel (original behaviour) */
export async function runAllAnalysers(
  data: CollectedData,
  hostname: string,
): Promise<AnalyserBatchResult> {
  return runAnalyserBatch(ALL_ANALYSERS, data, hostname, 'Wave 2 (all analysers)')
}

/** Run the 7 non-visual analysers in parallel */
export async function runRemainingAnalysers(
  data: CollectedData,
  hostname: string,
): Promise<AnalyserBatchResult> {
  return runAnalyserBatch(REMAINING_ANALYSERS, data, hostname, 'Wave 2b (remaining analysers)')
}
