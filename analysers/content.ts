import type { CollectedData, AnalysisResult, Finding } from '@/lib/types'

// Model: gemini-3-flash-preview (needs nuance but not Pro-level)
// Data in: html (wordCount, headings, forms, links), linkCheck

function wordCountFinding(wordCount: number): Finding {
  if (wordCount < 300) {
    return {
      id: 'content-001',
      title: 'Very thin content',
      description:
        'The page has very little text content. Search engines and visitors both prefer substantial, helpful content.',
      evidence: `Word count: ${wordCount} (recommended minimum: 300 for a landing page)`,
      evidenceType: 'METRIC',
      evidenceDetail: 'Word count',
      impact: 'High',
      fix: 'Add more meaningful content that addresses visitor questions and needs. Aim for at least 300 words on key pages.',
      category: 'Content Depth',
      section: 'Content & Conversion',
    }
  }

  if (wordCount > 3000) {
    return {
      id: 'content-001',
      title: 'Content may be too long for a landing page',
      description:
        'Very long pages can overwhelm visitors. Consider whether all content is necessary or if it should be split across pages.',
      evidence: `Word count: ${wordCount}`,
      evidenceType: 'METRIC',
      evidenceDetail: 'Word count',
      impact: 'Low',
      fix: 'Review content for relevance. Consider breaking into multiple pages or using tabbed/accordion layouts for better scannability.',
      category: 'Content Depth',
      section: 'Content & Conversion',
    }
  }

  return {
    id: 'content-001',
    title: 'Adequate content length',
    description: 'The page has a reasonable amount of content for visitors to engage with.',
    evidence: `Word count: ${wordCount}`,
    evidenceType: 'METRIC',
    evidenceDetail: 'Word count',
    impact: 'Low',
    fix: 'No action needed. Continue creating valuable content.',
    category: 'Content Depth',
    section: 'Content & Conversion',
  }
}

function formsFinding(forms: number): Finding {
  if (forms === 0) {
    return {
      id: 'content-003',
      title: 'No forms or conversion points found',
      description:
        'The page has no forms — no contact form, no signup, no newsletter subscription. Visitors have no way to take action.',
      evidence: 'Zero <form> elements detected on the page',
      evidenceType: 'MISSING',
      evidenceDetail: 'form elements expected',
      impact: 'High',
      fix: 'Add at least one call-to-action: a contact form, email signup, or clear "Get Started" button with a next step.',
      category: 'Conversion',
      section: 'Content & Conversion',
    }
  }

  return {
    id: 'content-003',
    title: `${forms} form${forms > 1 ? 's' : ''} detected`,
    description: `The page has ${forms} form element${forms > 1 ? 's' : ''}, providing conversion opportunities for visitors.`,
    evidence: `${forms} <form> element${forms > 1 ? 's' : ''} found`,
    evidenceType: 'HTML',
    evidenceDetail: 'form',
    impact: 'Low',
    fix: 'Ensure forms are easy to find, mobile-friendly, and have clear submit button labels.',
    category: 'Conversion',
    section: 'Content & Conversion',
  }
}

export async function analyseContent(
  data: CollectedData,
): Promise<AnalysisResult> {
  const { html, linkCheck } = data
  const { wordCount, headings, forms, links } = html

  // TODO: Replace with real AI call — see .claude/skills/api-providers/SKILL.md
  // Will send content data to Gemini Flash for deeper analysis

  const totalHeadings = headings.h1.length + headings.h2.length + headings.h3.length

  const findings: readonly Finding[] = [
    wordCountFinding(wordCount),
    ...(totalHeadings < 3 && wordCount > 500
      ? [
          {
            id: 'content-002',
            title: 'Content lacks structure',
            description:
              'Long content without headings is hard to scan. Visitors typically scan before reading — headings help them find what they need.',
            evidence: `Only ${totalHeadings} headings found for ${wordCount} words of content`,
            evidenceType: 'METRIC' as const,
            evidenceDetail: 'Heading count vs word count',
            impact: 'Medium' as const,
            fix: 'Add H2 and H3 headings every 200-300 words to break up content into scannable sections.',
            category: 'Structure',
            section: 'Content & Conversion',
          },
        ]
      : []),
    formsFinding(forms),
    ...(links.internal.length < 3
      ? [
          {
            id: 'content-004',
            title: 'Very few internal links',
            description:
              'Internal links help visitors explore your site and help search engines understand your site structure.',
            evidence: `Only ${links.internal.length} internal links found`,
            evidenceType: 'METRIC' as const,
            evidenceDetail: 'Internal link count',
            impact: 'Medium' as const,
            fix: 'Add contextual internal links to related pages. A good homepage should link to all major sections.',
            category: 'Navigation',
            section: 'Content & Conversion',
          },
        ]
      : []),
    ...(linkCheck && linkCheck.broken.length > 0
      ? [
          {
            id: 'content-005',
            title: `${linkCheck.broken.length} broken link${linkCheck.broken.length > 1 ? 's' : ''} found`,
            description:
              'Broken links frustrate visitors and hurt SEO. They signal to search engines that the site is poorly maintained.',
            evidence: linkCheck.broken
              .slice(0, 5)
              .map((bl) => `${bl.url} → ${bl.statusCode}`)
              .join(', '),
            evidenceType: 'HEADER' as const,
            evidenceDetail: 'HTTP status code',
            impact: 'High' as const,
            fix: 'Fix or remove each broken link. Set up a 301 redirect if the content has moved.',
            category: 'Links',
            section: 'Content & Conversion',
          },
        ]
      : []),
  ]

  const highImpactCount = findings.filter((f) => f.impact === 'High').length

  return {
    sectionTitle: 'Content & Conversion',
    eli5Summary:
      highImpactCount >= 2
        ? 'Your website content needs significant work — it\'s either too thin, poorly structured, or missing clear calls to action. Visitors won\'t know what to do next.'
        : highImpactCount >= 1
          ? 'Your content is mostly there but has some gaps. Adding clearer calls to action and fixing broken links would help convert more visitors.'
          : 'Your content is well-structured with good length and clear conversion points. Nice work.',
    whyItMatters:
      'Content is what convinces visitors to become customers. Without clear, well-structured content and obvious next steps, visitors leave without taking action.',
    overallRating: highImpactCount >= 2 ? 'Critical' : highImpactCount >= 1 ? 'Needs Work' : 'Good',
    findings: [...findings],
  }
}
