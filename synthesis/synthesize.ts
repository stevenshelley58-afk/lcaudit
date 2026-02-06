import type { AnalysisResult, TopFix } from '@/lib/types'

// Model: gpt-5 (reasoning.effort: "medium")
// Receives hostname, score, analyses, and top fixes
// Returns executive summary string

export async function synthesize(
  hostname: string,
  overallScore: number,
  analyses: readonly AnalysisResult[],
  topFixes: readonly TopFix[],
): Promise<string> {
  // TODO: Replace with real AI call — see .claude/skills/api-providers/SKILL.md
  // Will send all analyses to OpenAI gpt-5 with reasoning.effort: "medium"
  // to generate executive summary paragraph

  return generatePlaceholderSummary(
    hostname,
    overallScore,
    analyses,
    topFixes,
  )
}

function generatePlaceholderSummary(
  hostname: string,
  overallScore: number,
  analyses: readonly AnalysisResult[],
  topFixes: readonly TopFix[],
): string {
  const goodCount = analyses.filter(
    (a) => a.overallRating === 'Good',
  ).length
  const criticalCount = analyses.filter(
    (a) => a.overallRating === 'Critical',
  ).length
  const errorCount = analyses.filter(
    (a) => a.overallRating === 'Error',
  ).length

  const parts: string[] = []

  parts.push(`${hostname} scored ${overallScore}/100 overall.`)

  if (goodCount > 0) {
    parts.push(
      `${goodCount} section${goodCount > 1 ? 's' : ''} rated Good.`,
    )
  }

  if (criticalCount > 0) {
    parts.push(
      `${criticalCount} section${criticalCount > 1 ? 's' : ''} need${criticalCount === 1 ? 's' : ''} urgent attention.`,
    )
  }

  if (errorCount > 0) {
    parts.push(
      `${errorCount} section${errorCount > 1 ? 's' : ''} could not be analysed.`,
    )
  }

  if (topFixes.length > 0) {
    parts.push(
      `Top priority: ${topFixes[0].title.toLowerCase()}.`,
    )
  }

  return parts.join(' ')
}
