import type { CollectedData, AnalysisResult } from '@/lib/types'

// Model: gemini-3-flash-preview (structured Lighthouse data, cheap)
// Data in: lighthouse (accessibility score + diagnostics), html (images, forms, headings)

export async function analyseAccessibility(
  data: CollectedData,
): Promise<AnalysisResult> {
  const { lighthouse, html } = data

  const missingAltCount = html.images.filter((img) => !img.alt).length
  const a11yScore = lighthouse.mobile.accessibility

  // TODO: Replace with real AI call — see .claude/skills/api-providers/SKILL.md
  // Will send lighthouse accessibility data + DOM structure to Gemini Flash
  const result: AnalysisResult = {
    sectionTitle: 'Accessibility',
    eli5Summary:
      'Your website has some barriers that make it harder for people with disabilities to use. Screen readers will struggle with missing labels and poor heading structure.',
    whyItMatters:
      'About 15% of the world\'s population has a disability. Inaccessible sites exclude potential customers and may expose you to legal risk.',
    overallRating: a11yScore >= 90 ? 'Good' : a11yScore >= 50 ? 'Needs Work' : 'Critical',
    findings: [
      {
        id: 'a11y-001',
        title: `Accessibility score: ${a11yScore}/100`,
        description:
          a11yScore >= 90
            ? 'The Lighthouse accessibility score is good, indicating most automated checks pass.'
            : 'The Lighthouse accessibility score indicates significant issues that need attention.',
        evidence: `Lighthouse accessibility score: ${a11yScore}/100`,
        evidenceType: 'METRIC',
        evidenceDetail: 'Lighthouse Accessibility Score',
        impact: a11yScore >= 90 ? 'Low' : 'High',
        fix: a11yScore >= 90
          ? 'Continue maintaining accessibility standards. Run manual testing with a screen reader for full coverage.'
          : 'Address the specific issues below to improve the score. Focus on high-impact items first.',
        category: 'Overall',
        section: 'Accessibility',
      },
      {
        id: 'a11y-002',
        title: missingAltCount > 0
          ? `${missingAltCount} images missing alt text`
          : 'All images have alt text',
        description:
          missingAltCount > 0
            ? 'Images without alt text are invisible to screen reader users and fail WCAG 1.1.1 (Non-text Content).'
            : 'All images have alt attributes, meeting WCAG 1.1.1.',
        evidence: missingAltCount > 0
          ? `${missingAltCount} of ${html.images.length} images lack alt attribute`
          : `All ${html.images.length} images have alt text`,
        evidenceType: missingAltCount > 0 ? 'HTML' : 'HTML',
        evidenceDetail: 'img:not([alt])',
        impact: missingAltCount > 0 ? 'High' : 'Low',
        fix: missingAltCount > 0
          ? 'Add descriptive alt text to all informational images. Use alt="" for purely decorative images.'
          : 'No action needed.',
        category: 'Images',
        section: 'Accessibility',
      },
      {
        id: 'a11y-003',
        title: !html.language
          ? 'Page language not declared'
          : 'Page language is declared',
        description:
          !html.language
            ? 'The <html> element is missing a lang attribute. Screen readers need this to select the correct pronunciation rules.'
            : `Page language is set to "${html.language}".`,
        evidence: html.language
          ? `<html lang="${html.language}">`
          : 'No lang attribute on <html> element',
        evidenceType: html.language ? 'HTML' : 'MISSING',
        evidenceDetail: html.language ? 'html[lang]' : 'html[lang] expected',
        impact: !html.language ? 'High' : 'Low',
        fix: !html.language
          ? 'Add a lang attribute to the <html> element, e.g. <html lang="en">.'
          : 'No action needed.',
        category: 'Document',
        section: 'Accessibility',
      },
      {
        id: 'a11y-004',
        title: html.headings.h1.length === 0
          ? 'No H1 heading found'
          : 'Heading hierarchy check',
        description:
          'A proper heading hierarchy (H1 → H2 → H3) helps screen reader users navigate the page structure.',
        evidence: `H1: ${html.headings.h1.length}, H2: ${html.headings.h2.length}, H3: ${html.headings.h3.length}`,
        evidenceType: 'HTML',
        evidenceDetail: 'h1, h2, h3',
        impact: html.headings.h1.length === 0 ? 'High' : 'Medium',
        fix: 'Ensure a single H1 exists and headings follow a logical hierarchy without skipping levels.',
        category: 'Structure',
        section: 'Accessibility',
      },
    ],
  }

  return result
}
