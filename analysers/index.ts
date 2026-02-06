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

interface AnalyserDef {
  readonly name: string
  readonly fn: (data: CollectedData) => Promise<AnalysisResult>
}

const ANALYSERS: readonly AnalyserDef[] = [
  { name: 'Visual & Design', fn: analyseVisual },
  { name: 'Performance & Speed', fn: analysePerformance },
  { name: 'SEO & Keywords', fn: analyseSeo },
  { name: 'Accessibility', fn: analyseAccessibility },
  { name: 'Security & Trust', fn: analyseSecurity },
  { name: 'Social & Sharing', fn: analyseSocial },
  { name: 'Tech Stack & Apps', fn: analyseTechStack },
  { name: 'Content & Conversion', fn: analyseContent },
]

function makeErrorResult(name: string, error: Error): AnalysisResult {
  return {
    sectionTitle: name,
    eli5Summary: `Analysis unavailable — ${error.message}`,
    whyItMatters: 'This section could not be analysed due to an error.',
    overallRating: 'Error',
    findings: [],
  }
}

export async function runAllAnalysers(
  data: CollectedData,
): Promise<readonly AnalysisResult[]> {
  const results = await Promise.allSettled(
    ANALYSERS.map((a) =>
      withTimeout(a.fn(data), AI_TIMEOUT_MS, a.name),
    ),
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    // TODO: log to debug trace when debug module is wired in (Phase 4)
    return makeErrorResult(
      ANALYSERS[index].name,
      result.reason as Error,
    )
  })
}
