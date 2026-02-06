import type { CollectedData, AnalysisResult } from '@/lib/types'

// Model: gemini-3-flash-preview (structured data, cheap and fast)
// Data in: lighthouse (scores + diagnostics), html (images for size context)

export async function analysePerformance(
  data: CollectedData,
): Promise<AnalysisResult> {
  const { lighthouse, html } = data

  // TODO: Replace with real AI call — see .claude/skills/api-providers/SKILL.md
  // Will send lighthouse data as structured JSON to Gemini Flash
  const result: AnalysisResult = {
    sectionTitle: 'Performance & Speed',
    eli5Summary:
      'Your website loads slowly on mobile — visitors are waiting over 4 seconds before they can see your content. Desktop is better but still has room to improve.',
    whyItMatters:
      'Every second of load time costs you roughly 7% of conversions. Google also uses speed as a ranking factor.',
    overallRating: 'Critical',
    findings: [
      {
        id: 'perf-001',
        title: 'Largest Contentful Paint (LCP) is too slow on mobile',
        description:
          'The largest visible element takes over 4 seconds to render on mobile. Google recommends under 2.5 seconds for a good experience.',
        evidence: `Mobile LCP: ${lighthouse.mobile.lcp.toFixed(1)}s (threshold: 2.5s)`,
        evidenceType: 'METRIC',
        evidenceDetail: 'LCP',
        impact: 'High',
        fix: 'Optimise the hero image (compress, use WebP format, add width/height attributes). Consider lazy-loading below-fold images.',
        category: 'Core Web Vitals',
        section: 'Performance & Speed',
      },
      {
        id: 'perf-002',
        title: 'Total Blocking Time is excessive',
        description:
          'The browser is blocked from responding to user input for a significant amount of time during page load, making the page feel unresponsive.',
        evidence: `Mobile TBT: ${lighthouse.mobile.tbt}ms (threshold: 200ms)`,
        evidenceType: 'METRIC',
        evidenceDetail: 'TBT',
        impact: 'High',
        fix: 'Defer non-critical JavaScript. Split large bundles into smaller chunks. Move heavy computations to Web Workers.',
        category: 'Core Web Vitals',
        section: 'Performance & Speed',
      },
      {
        id: 'perf-003',
        title: 'Too many images without lazy loading',
        description:
          `The page loads ${html.images.length} images upfront. Below-fold images should use lazy loading to avoid wasting bandwidth.`,
        evidence: `${html.images.length} images found, most loaded eagerly`,
        evidenceType: 'METRIC',
        evidenceDetail: 'Image count',
        impact: 'Medium',
        fix: 'Add loading="lazy" to all images below the fold. Keep above-fold images eager for LCP.',
        category: 'Images',
        section: 'Performance & Speed',
      },
      {
        id: 'perf-004',
        title: 'Mobile performance score below 50',
        description:
          'The overall Lighthouse performance score on mobile is poor, indicating significant optimisation opportunities.',
        evidence: `Mobile performance score: ${lighthouse.mobile.performance}/100`,
        evidenceType: 'METRIC',
        evidenceDetail: 'Lighthouse Performance Score',
        impact: 'High',
        fix: 'Address LCP, TBT, and CLS issues first as they have the largest impact on the overall score.',
        category: 'Overall',
        section: 'Performance & Speed',
      },
      {
        id: 'perf-005',
        title: 'Cumulative Layout Shift above threshold',
        description:
          'Elements move around during page load, causing a frustrating visual experience. This is often caused by images without dimensions or dynamically injected content.',
        evidence: `Mobile CLS: ${lighthouse.mobile.cls} (threshold: 0.1)`,
        evidenceType: 'METRIC',
        evidenceDetail: 'CLS',
        impact: 'Medium',
        fix: 'Add explicit width and height attributes to all images and video elements. Reserve space for ad slots and dynamic content.',
        category: 'Core Web Vitals',
        section: 'Performance & Speed',
      },
    ],
  }

  return result
}
