import type { CollectedData, AnalysisResult, Finding } from '@/lib/types'

// Model: gpt-4o-mini (trivial analysis, cheapest)
// Data in: html (ogTags, twitterCard, favicon)

function ogTitleFinding(title: string | null): Finding {
  if (!title) {
    return {
      id: 'social-001',
      title: 'Missing Open Graph title',
      description:
        'When someone shares your link on Facebook, LinkedIn, or Slack, there won\'t be a proper title displayed.',
      evidence: 'No og:title meta tag found',
      evidenceType: 'MISSING',
      evidenceDetail: 'head > meta[property="og:title"] expected',
      impact: 'High',
      fix: 'Add <meta property="og:title" content="Your Page Title"> to the <head>.',
      category: 'Open Graph',
      section: 'Social & Sharing',
    }
  }

  return {
    id: 'social-001',
    title: 'Open Graph title is set',
    description: 'Your page has a proper title for social sharing.',
    evidence: `og:title = "${title}"`,
    evidenceType: 'HTML',
    evidenceDetail: 'meta[property="og:title"]',
    impact: 'Low',
    fix: 'No action needed. Ensure the title stays relevant when updating page content.',
    category: 'Open Graph',
    section: 'Social & Sharing',
  }
}

function ogImageFinding(image: string | null): Finding {
  if (!image) {
    return {
      id: 'social-003',
      title: 'Missing Open Graph image',
      description:
        'Shared links will show a generic placeholder instead of an eye-catching image. Posts with images get significantly more engagement.',
      evidence: 'No og:image meta tag found',
      evidenceType: 'MISSING',
      evidenceDetail: 'head > meta[property="og:image"] expected',
      impact: 'High',
      fix: 'Add <meta property="og:image" content="https://yoursite.com/og-image.jpg">. Recommended size: 1200x630 pixels.',
      category: 'Open Graph',
      section: 'Social & Sharing',
    }
  }

  return {
    id: 'social-003',
    title: 'Open Graph image is set',
    description: 'Your page has a social sharing image configured.',
    evidence: `og:image = "${image}"`,
    evidenceType: 'HTML',
    evidenceDetail: 'meta[property="og:image"]',
    impact: 'Low',
    fix: 'Ensure the image is at least 1200x630 pixels for best display on all platforms.',
    category: 'Open Graph',
    section: 'Social & Sharing',
  }
}

export async function analyseSocial(
  data: CollectedData,
): Promise<AnalysisResult> {
  const { ogTags, twitterCard, favicon } = data.html

  // TODO: Replace with real AI call — see .claude/skills/api-providers/SKILL.md
  // Will send OG/Twitter/favicon data to OpenAI gpt-4o-mini

  const findings: readonly Finding[] = [
    ogTitleFinding(ogTags.title),
    ...(!ogTags.description
      ? [
          {
            id: 'social-002',
            title: 'Missing Open Graph description',
            description:
              'Shared links won\'t show a description preview, reducing click-through rates from social media.',
            evidence: 'No og:description meta tag found',
            evidenceType: 'MISSING' as const,
            evidenceDetail: 'head > meta[property="og:description"] expected',
            impact: 'Medium' as const,
            fix: 'Add <meta property="og:description" content="A compelling description..."> to the <head>.',
            category: 'Open Graph',
            section: 'Social & Sharing',
          },
        ]
      : []),
    ogImageFinding(ogTags.image),
    ...(!twitterCard.card
      ? [
          {
            id: 'social-004',
            title: 'No Twitter Card configured',
            description:
              'Links shared on X (Twitter) will use a basic text preview instead of a rich card with image.',
            evidence: 'No twitter:card meta tag found',
            evidenceType: 'MISSING' as const,
            evidenceDetail: 'head > meta[name="twitter:card"] expected',
            impact: 'Medium' as const,
            fix: 'Add <meta name="twitter:card" content="summary_large_image"> for a rich preview on X.',
            category: 'Twitter Card',
            section: 'Social & Sharing',
          },
        ]
      : []),
    ...(!favicon
      ? [
          {
            id: 'social-005',
            title: 'No favicon detected',
            description:
              'Your site doesn\'t have a favicon — the small icon shown in browser tabs and bookmarks. This makes your site look unprofessional.',
            evidence: 'No favicon link tag or favicon.ico found',
            evidenceType: 'MISSING' as const,
            evidenceDetail: 'head > link[rel="icon"] expected',
            impact: 'Medium' as const,
            fix: 'Add a favicon.ico to your site root and a <link rel="icon"> tag in <head>. Include multiple sizes for different devices.',
            category: 'Branding',
            section: 'Social & Sharing',
          },
        ]
      : []),
  ]

  const missingCount = findings.filter(
    (f) => f.evidenceType === 'MISSING',
  ).length

  return {
    sectionTitle: 'Social & Sharing',
    eli5Summary:
      missingCount >= 3
        ? 'When people share your website link on social media, it looks bare — no image, no description. You\'re missing opportunities to attract clicks.'
        : missingCount >= 1
          ? 'Your social sharing setup is partially complete but missing some key elements that would improve how shared links look.'
          : 'Your social sharing tags are well-configured. Links shared on social media will display with proper titles, descriptions, and images.',
    whyItMatters:
      'Social sharing is free marketing. A well-configured preview card can dramatically increase click-through rates when someone shares your link.',
    overallRating: missingCount >= 3 ? 'Critical' : missingCount >= 1 ? 'Needs Work' : 'Good',
    findings: [...findings],
  }
}
