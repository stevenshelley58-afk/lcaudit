import { synthesize } from '@/synthesis/synthesize'
import { storeAuditReport, addToAuditHistory } from '@/lib/storage'
import type {
  CollectedData,
  AnalysisResult,
  AuditReport,
  AuditSection,
  TopFix,
  RecommendedApp,
  AuditHistoryEntry,
} from '@/lib/types'

const SECTION_ICONS: Record<string, string> = {
  'Visual & Design': 'eye',
  'Performance & Speed': 'gauge',
  'SEO & Keywords': 'search',
  'Accessibility': 'accessibility',
  'Security & Trust': 'shield',
  'Social & Sharing': 'share-2',
  'Tech Stack & Apps': 'layers',
  'Content & Conversion': 'file-text',
}

function sectionIdFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildSections(
  analyses: readonly AnalysisResult[],
): readonly AuditSection[] {
  return analyses.map((analysis) => ({
    id: sectionIdFromTitle(analysis.sectionTitle),
    title: analysis.sectionTitle,
    iconKey: SECTION_ICONS[analysis.sectionTitle] ?? 'circle',
    eli5Summary: analysis.eli5Summary,
    whyItMatters: analysis.whyItMatters,
    rating: analysis.overallRating,
    score: analysis.overallRating === 'Error' ? null : analysis.score,
    findings: [...analysis.findings],
  }))
}

function extractTopFixes(
  analyses: readonly AnalysisResult[],
): readonly TopFix[] {
  const allFindings = analyses.flatMap((a) =>
    a.findings.map((f) => ({ ...f, sectionTitle: a.sectionTitle })),
  )

  const highImpact = allFindings
    .filter((f) => f.impact === 'High')
    .slice(0, 5)

  return highImpact.map((f) => ({
    title: f.title,
    section: f.sectionTitle,
    impact: f.impact,
    description: f.fix,
  }))
}

function calculateOverallScore(
  analyses: readonly AnalysisResult[],
): number {
  const weights: Record<string, number> = {
    'Visual & Design': 1.5,
    'Performance & Speed': 1.5,
    'SEO & Keywords': 1,
    'Accessibility': 1,
    'Security & Trust': 1,
    'Social & Sharing': 0.75,
    'Tech Stack & Apps': 0.75,
    'Content & Conversion': 1,
  }

  let weightedSum = 0
  let totalWeight = 0

  for (const a of analyses) {
    if (a.overallRating === 'Error') continue
    const weight = weights[a.sectionTitle] ?? 1
    weightedSum += a.score * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return 0
  return Math.round(weightedSum / totalWeight)
}

function generateFallbackSummary(
  hostname: string,
  overallScore: number,
  analyses: readonly AnalysisResult[],
  topFixes: readonly TopFix[],
): string {
  const goodCount = analyses.filter((a) => a.overallRating === 'Good').length
  const criticalCount = analyses.filter((a) => a.overallRating === 'Critical').length
  const errorCount = analyses.filter((a) => a.overallRating === 'Error').length

  const parts: string[] = []
  parts.push(`${hostname} scored ${overallScore}/100 overall.`)

  if (goodCount > 0) {
    parts.push(`${goodCount} section${goodCount > 1 ? 's' : ''} rated Good.`)
  }
  if (criticalCount > 0) {
    parts.push(`${criticalCount} section${criticalCount > 1 ? 's' : ''} need${criticalCount === 1 ? 's' : ''} urgent attention.`)
  }
  if (errorCount > 0) {
    parts.push(`${errorCount} section${errorCount > 1 ? 's' : ''} could not be analysed.`)
  }
  if (topFixes.length > 0) {
    parts.push(`Top priority: ${topFixes[0].title.toLowerCase()}.`)
  }

  return parts.join(' ')
}

function extractMissingApps(
  analyses: readonly AnalysisResult[],
): readonly RecommendedApp[] {
  const apps: RecommendedApp[] = []

  const techAnalysis = analyses.find(
    (a) => a.sectionTitle === 'Tech Stack & Apps',
  )
  if (techAnalysis) {
    const missingFindings = techAnalysis.findings.filter(
      (f) => f.evidenceType === 'MISSING' && f.category === 'Missing Tools',
    )
    for (const f of missingFindings) {
      apps.push({
        name: f.title.replace(/^No\s+/, '').replace(/\s+detected$/, ''),
        category: f.category,
        reason: f.description,
      })
    }
  }

  return apps
}

export interface ScreenshotUrls {
  readonly desktop: string
  readonly mobile: string
}

interface BuildReportParams {
  readonly auditId: string
  readonly url: string
  readonly hostname: string
  readonly collectedData: CollectedData
  readonly screenshotUrls: ScreenshotUrls
  readonly analyses: readonly AnalysisResult[]
  readonly durationMs: number
}

export async function buildReport({
  auditId,
  url,
  hostname,
  collectedData,
  screenshotUrls,
  analyses,
  durationMs,
}: BuildReportParams): Promise<AuditReport> {
  const sections = buildSections(analyses)
  const localTopFixes = extractTopFixes(analyses)
  const localScore = calculateOverallScore(analyses)
  const missingApps = extractMissingApps(analyses)

  const unavailableSections = analyses
    .filter((a) => a.overallRating === 'Error')
    .map((a) => sectionIdFromTitle(a.sectionTitle))

  // Try AI synthesis, fall back to local computation
  let executiveSummary: string
  let overallScore: number
  let topFixes: readonly TopFix[]

  try {
    const synthesis = await synthesize(hostname, analyses, collectedData)
    executiveSummary = synthesis.executiveSummary
    overallScore = synthesis.overallScore
    topFixes = synthesis.topFixes
  } catch {
    executiveSummary = generateFallbackSummary(hostname, localScore, analyses, localTopFixes)
    overallScore = localScore
    topFixes = localTopFixes
  }

  const report: AuditReport = {
    url,
    hostname,
    generatedAt: new Date().toISOString(),
    auditDurationMs: durationMs,
    overallScore,
    executiveSummary,
    sections: [...sections],
    topFixes: [...topFixes],
    platform: collectedData.techStack?.platform ?? null,
    detectedApps: collectedData.techStack
      ? [...collectedData.techStack.detectedApps]
      : [],
    missingApps: [...missingApps],
    screenshots: {
      desktop: screenshotUrls.desktop,
      mobile: screenshotUrls.mobile,
    },
    socialPreview: {
      ogImage: collectedData.html.ogTags.image,
      ogTitle: collectedData.html.ogTags.title,
      ogDescription: collectedData.html.ogTags.description,
    },
    lighthouse: {
      mobile: { ...collectedData.lighthouse.mobile },
      desktop: { ...collectedData.lighthouse.desktop },
    },
    unavailableSections: [...unavailableSections],
  }

  // Persist report and history (non-blocking — don't fail the audit)
  try {
    const reportUrl = await storeAuditReport(auditId, report)

    const historyEntry: AuditHistoryEntry = {
      auditId,
      url,
      hostname,
      overallScore,
      status: 'complete',
      createdAt: report.generatedAt,
      reportUrl,
    }
    await addToAuditHistory(historyEntry)
  } catch {
    // Storage failure is non-fatal — report still returned to user
  }

  return report
}
