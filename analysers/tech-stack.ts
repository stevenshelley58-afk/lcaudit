import type { CollectedData, AnalysisResult, Finding } from '@/lib/types'

// Model: gpt-4o-mini (pattern matching, minimal reasoning)
// Data in: techStack

export async function analyseTechStack(
  data: CollectedData,
): Promise<AnalysisResult> {
  const { techStack } = data

  if (!techStack) {
    return {
      sectionTitle: 'Tech Stack & Apps',
      eli5Summary:
        'We couldn\'t detect the technology running your website. This section requires tech stack data to provide recommendations.',
      whyItMatters:
        'Understanding your tech stack helps identify missing tools and integration opportunities.',
      overallRating: 'Error',
      findings: [
        {
          id: 'tech-nodata',
          title: 'Tech stack data unavailable',
          description:
            'The tech stack collector did not return data. This may be because the site uses obfuscation or our detection failed.',
          evidence: 'Tech stack collector returned null',
          evidenceType: 'MISSING',
          evidenceDetail: 'techStack data expected',
          impact: 'Low',
          fix: 'Retry the audit. If the issue persists, the site may be blocking automated detection.',
          category: 'Data',
          section: 'Tech Stack & Apps',
        },
      ],
    }
  }

  // TODO: Replace with real AI call — see .claude/skills/api-providers/SKILL.md
  // Will send tech stack data to OpenAI gpt-4o-mini for recommendations

  const hasAnalytics = techStack.detectedApps.some(
    (a) =>
      a.category.toLowerCase().includes('analytics') ||
      a.name.toLowerCase().includes('analytics') ||
      a.name.toLowerCase().includes('google tag'),
  )

  const findings: readonly Finding[] = [
    ...(techStack.platform
      ? [
          {
            id: 'tech-001',
            title: `Platform detected: ${techStack.platform}`,
            description: `Your website is built on ${techStack.platform}. This is a well-known platform with a large ecosystem of plugins and integrations.`,
            evidence: `Platform: ${techStack.platform}`,
            evidenceType: 'METRIC' as const,
            evidenceDetail: 'Platform detection',
            impact: 'Low' as const,
            fix: 'No action needed. Ensure you keep the platform updated to the latest stable version.',
            category: 'Platform',
            section: 'Tech Stack & Apps',
          },
        ]
      : []),
    ...(techStack.detectedApps.length > 0
      ? [
          {
            id: 'tech-002',
            title: `${techStack.detectedApps.length} technologies detected`,
            description:
              `We found ${techStack.detectedApps.length} technologies and integrations on your site: ${techStack.detectedApps.map((a) => a.name).join(', ')}.`,
            evidence: techStack.detectedApps
              .map(
                (a) =>
                  `${a.name} (${a.category}${a.version ? `, v${a.version}` : ''})`,
              )
              .join(', '),
            evidenceType: 'METRIC' as const,
            evidenceDetail: 'Detected technologies',
            impact: 'Low' as const,
            fix: 'Review each technology to ensure it\'s still needed and up to date. Remove unused scripts to improve performance.',
            category: 'Technologies',
            section: 'Tech Stack & Apps',
          },
        ]
      : []),
    {
      id: 'tech-003',
      title: techStack.thirdPartyCount > 10
        ? `High number of third-party scripts (${techStack.thirdPartyCount})`
        : `${techStack.thirdPartyCount} third-party scripts detected`,
      description: techStack.thirdPartyCount > 10
        ? 'Loading many third-party scripts increases page weight, slows performance, and introduces potential security risks.'
        : 'A reasonable number of third-party scripts are loaded.',
      evidence: techStack.thirdPartyCount > 10
        ? `${techStack.thirdPartyCount} third-party script domains detected: ${techStack.thirdPartyScripts.slice(0, 5).map((s) => s.domain).join(', ')}${techStack.thirdPartyCount > 5 ? '...' : ''}`
        : `${techStack.thirdPartyCount} third-party script domains detected`,
      evidenceType: 'METRIC',
      evidenceDetail: 'Third-party script count',
      impact: techStack.thirdPartyCount > 10 ? 'Medium' : 'Low',
      fix: techStack.thirdPartyCount > 10
        ? 'Audit third-party scripts and remove any that are unused. Consider self-hosting critical scripts and lazy-loading non-essential ones.'
        : 'Continue monitoring third-party script count. Review periodically to ensure all are still needed.',
      category: 'Performance',
      section: 'Tech Stack & Apps',
    },
    ...(!hasAnalytics
      ? [
          {
            id: 'tech-004',
            title: 'No analytics tool detected',
            description:
              'We couldn\'t detect any analytics tool on your site. Without analytics, you can\'t measure traffic, understand user behaviour, or track conversions.',
            evidence: 'No analytics scripts found among detected technologies',
            evidenceType: 'MISSING' as const,
            evidenceDetail: 'Analytics tool expected',
            impact: 'High' as const,
            fix: 'Install Google Analytics 4, Plausible, or another analytics tool to start tracking visitor behaviour.',
            category: 'Missing Tools',
            section: 'Tech Stack & Apps',
          },
        ]
      : []),
  ]

  const highImpactCount = findings.filter((f) => f.impact === 'High').length

  return {
    sectionTitle: 'Tech Stack & Apps',
    eli5Summary:
      techStack.platform
        ? `Your site runs on ${techStack.platform} with ${techStack.detectedApps.length} technologies detected. ${highImpactCount > 0 ? 'There are some important tools missing.' : 'Your tech stack looks solid.'}`
        : `We detected ${techStack.detectedApps.length} technologies on your site. ${highImpactCount > 0 ? 'Some essential tools appear to be missing.' : 'Your setup looks reasonable.'}`,
    whyItMatters:
      'The right tech stack powers growth — analytics, SEO tools, and performance monitoring help you understand and improve your online presence.',
    overallRating: highImpactCount >= 2 ? 'Critical' : highImpactCount >= 1 ? 'Needs Work' : 'Good',
    findings: [...findings],
  }
}
