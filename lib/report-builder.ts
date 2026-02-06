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

function ratingToScore(rating: string): number | null {
  switch (rating) {
    case 'Good':
      return 90
    case 'Needs Work':
      return 60
    case 'Critical':
      return 30
    case 'Error':
      return null
    default:
      return null
  }
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
    score: ratingToScore(analysis.overallRating),
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
  const scores = analyses
    .map((a) => ratingToScore(a.overallRating))
    .filter((s): s is number => s !== null)

  if (scores.length === 0) return 0
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
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

interface BuildReportParams {
  readonly auditId: string
  readonly url: string
  readonly hostname: string
  readonly collectedData: CollectedData
  readonly analyses: readonly AnalysisResult[]
  readonly durationMs: number
}

export async function buildReport({
  auditId,
  url,
  hostname,
  collectedData,
  analyses,
  durationMs,
}: BuildReportParams): Promise<AuditReport> {
  const sections = buildSections(analyses)
  const topFixes = extractTopFixes(analyses)
  const overallScore = calculateOverallScore(analyses)
  const missingApps = extractMissingApps(analyses)

  const unavailableSections = analyses
    .filter((a) => a.overallRating === 'Error')
    .map((a) => sectionIdFromTitle(a.sectionTitle))

  const executiveSummary = await synthesize(hostname, overallScore, analyses, topFixes)

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
      desktop: collectedData.screenshots.desktop,
      mobile: collectedData.screenshots.mobile,
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
