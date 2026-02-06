import type { CollectedData, AnalysisResult } from '@/lib/types'

// Model: gemini-3-pro-preview (multimodal — sees screenshots)
// Data in: screenshots (desktop/mobile URLs), html (headings, images, links)

export async function analyseVisual(
  data: CollectedData,
): Promise<AnalysisResult> {
  const { screenshots, html } = data

  // TODO: Replace with real AI call — see .claude/skills/api-providers/SKILL.md
  // Will send screenshot URLs as image parts to Gemini multimodal
  const result: AnalysisResult = {
    sectionTitle: 'Visual & Design',
    eli5Summary:
      'Your website looks decent on desktop but has some layout issues on mobile. Text is a bit small on phones and some images look stretched.',
    whyItMatters:
      'Over 60% of web traffic comes from mobile devices. Poor visual design increases bounce rates and reduces trust.',
    overallRating: 'Needs Work',
    findings: [
      {
        id: 'vis-001',
        title: 'Mobile text too small to read comfortably',
        description:
          'Body text on mobile appears to be below the recommended 16px minimum, making it difficult to read without zooming.',
        evidence: 'Body text measured at approximately 13px on mobile viewport',
        evidenceType: 'SCREENSHOT',
        evidenceDetail: 'mobile — body text area below hero section',
        impact: 'High',
        fix: 'Set base font-size to at least 16px on mobile breakpoints.',
        category: 'Typography',
        section: 'Visual & Design',
      },
      {
        id: 'vis-002',
        title: 'No consistent colour palette detected',
        description:
          'The page uses more than 8 distinct accent colours, suggesting an inconsistent or undefined colour system.',
        evidence:
          'Multiple competing accent colours visible across buttons, links, and headings',
        evidenceType: 'SCREENSHOT',
        evidenceDetail: 'desktop — full page overview',
        impact: 'Medium',
        fix: 'Define a primary, secondary, and accent colour palette and apply consistently across the site.',
        category: 'Colour',
        section: 'Visual & Design',
      },
      {
        id: 'vis-003',
        title: 'Hero image lacks focal point on mobile',
        description:
          'The hero banner image is cropped awkwardly on mobile, cutting off the primary subject.',
        evidence:
          'Hero image subject partially cropped on right side at 390px viewport width',
        evidenceType: 'SCREENSHOT',
        evidenceDetail: 'mobile — hero section top of page',
        impact: 'Medium',
        fix: 'Use art direction (different crops per breakpoint) or CSS object-position to ensure the focal point remains visible on mobile.',
        category: 'Images',
        section: 'Visual & Design',
      },
      {
        id: 'vis-004',
        title: 'CTA button has low contrast ratio',
        description:
          'The primary call-to-action button uses light text on a medium-tone background, failing WCAG contrast requirements.',
        evidence:
          'Estimated contrast ratio of approximately 3.2:1, below the 4.5:1 minimum for normal text',
        evidenceType: 'SCREENSHOT',
        evidenceDetail: 'desktop — primary CTA button in hero section',
        impact: 'High',
        fix: 'Darken the button background or use white text on a darker background to achieve at least 4.5:1 contrast ratio.',
        category: 'Contrast',
        section: 'Visual & Design',
      },
    ],
  }

  return result
}
