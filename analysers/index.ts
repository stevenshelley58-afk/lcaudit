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
  readonly fn: (data: CollectedData) => Promise<AnalysisResult>
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

export function makeErrorResult(name: string, error: Error): AnalysisResult {
  return {
    sectionTitle: name,
    eli5Summary: `Analysis unavailable — ${error.message}`,
    whyItMatters: 'This section could not be analysed due to an error.',
    overallRating: 'Error',
    score: 0,
    findings: [],
  }
}

async function runAnalyserBatch(
  analysers: readonly AnalyserDef[],
  data: CollectedData,
  label: string,
): Promise<readonly AnalysisResult[]> {
  const waveStart = Date.now()

  const results = await Promise.allSettled(
    analysers.map(async (a) => {
      const t0 = Date.now()
      try {
        const result = await withTimeout(a.fn(data), AI_TIMEOUT_MS, a.name)
        console.log(`[analyser] ${a.name} OK in ${Date.now() - t0}ms`)
        return result
      } catch (err) {
        console.log(`[analyser] ${a.name} FAILED in ${Date.now() - t0}ms: ${(err as Error).message}`)
        throw err
      }
    }),
  )

  console.log(`[pipeline] ${label} done in ${Date.now() - waveStart}ms`)

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    return makeErrorResult(
      analysers[index].name,
      result.reason as Error,
    )
  })
}

/** Run all 8 analysers in parallel (original behaviour) */
export async function runAllAnalysers(
  data: CollectedData,
): Promise<readonly AnalysisResult[]> {
  return runAnalyserBatch(ALL_ANALYSERS, data, 'Wave 2 (all analysers)')
}

/** Run the 7 non-visual analysers in parallel */
export async function runRemainingAnalysers(
  data: CollectedData,
): Promise<readonly AnalysisResult[]> {
  return runAnalyserBatch(REMAINING_ANALYSERS, data, 'Wave 2b (remaining analysers)')
}
