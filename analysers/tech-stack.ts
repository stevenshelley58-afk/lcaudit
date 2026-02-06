import { zodToJsonSchema } from 'zod-to-json-schema'
import { ThinkingLevel } from '@google/genai'
import { getOpenAiClient, getGeminiClient } from '@/lib/ai'
import { AnalysisResultSchema } from '@/lib/types'
import type { CollectedData, AnalysisResult, Finding } from '@/lib/types'

// --- Heuristic fallback ---

function buildHeuristicResult(data: CollectedData): AnalysisResult {
  const { techStack } = data

  if (!techStack) {
    return {
      sectionTitle: 'Tech Stack & Apps',
      eli5Summary: "Could not detect the technology running the site.",
      whyItMatters: 'Understanding the tech stack helps identify missing tools and integration opportunities.',
      overallRating: 'Error',
      score: 0,
      findings: [{
        id: 'tech-nodata',
        title: 'Tech stack data unavailable',
        description: 'The tech stack collector did not return data.',
        evidence: 'Tech stack collector returned null',
        evidenceType: 'MISSING',
        evidenceDetail: 'techStack data expected',
        impact: 'Low',
        fix: 'Retry the audit.',
        category: 'Data',
        section: 'Tech Stack & Apps',
      }],
    }
  }

  const hasAnalytics = techStack.detectedApps.some(
    (a) =>
      a.category.toLowerCase().includes('analytics') ||
      a.name.toLowerCase().includes('analytics') ||
      a.name.toLowerCase().includes('google tag'),
  )

  const findings: Finding[] = []

  if (techStack.platform) {
    findings.push({
      id: 'tech-001',
      title: `Platform detected: ${techStack.platform}`,
      description: `The site is built on ${techStack.platform}.`,
      evidence: `Platform: ${techStack.platform}`,
      evidenceType: 'METRIC',
      evidenceDetail: 'Platform detection',
      impact: 'Low',
      fix: 'Keep the platform updated to the latest stable version.',
      category: 'Platform',
      section: 'Tech Stack & Apps',
    })
  }

  if (techStack.detectedApps.length > 0) {
    findings.push({
      id: 'tech-002',
      title: `${techStack.detectedApps.length} technologies detected`,
      description: `Found: ${techStack.detectedApps.map((a) => a.name).join(', ')}.`,
      evidence: techStack.detectedApps.map((a) => `${a.name} (${a.category}${a.version ? `, v${a.version}` : ''})`).join(', '),
      evidenceType: 'METRIC',
      evidenceDetail: 'Detected technologies',
      impact: 'Low',
      fix: 'Review each technology to ensure it is still needed and up to date.',
      category: 'Technologies',
      section: 'Tech Stack & Apps',
    })
  }

  findings.push({
    id: 'tech-003',
    title: techStack.thirdPartyCount > 10
      ? `High number of third-party scripts (${techStack.thirdPartyCount})`
      : `${techStack.thirdPartyCount} third-party scripts detected`,
    description: techStack.thirdPartyCount > 10
      ? 'Loading many third-party scripts increases page weight and slows performance.'
      : 'A reasonable number of third-party scripts are loaded.',
    evidence: `${techStack.thirdPartyCount} third-party script domains detected`,
    evidenceType: 'METRIC',
    evidenceDetail: 'Third-party script count',
    impact: techStack.thirdPartyCount > 10 ? 'Medium' : 'Low',
    fix: techStack.thirdPartyCount > 10
      ? 'Audit third-party scripts and remove unused ones.'
      : 'Continue monitoring.',
    category: 'Performance',
    section: 'Tech Stack & Apps',
  })

  if (!hasAnalytics) {
    findings.push({
      id: 'tech-004',
      title: 'No analytics tool detected',
      description: "Without analytics, there is no way to measure traffic or track conversions.",
      evidence: 'No analytics scripts found among detected technologies',
      evidenceType: 'MISSING',
      evidenceDetail: 'Analytics tool expected',
      impact: 'High',
      fix: 'Install Google Analytics 4, Plausible, or another analytics tool.',
      category: 'Missing Tools',
      section: 'Tech Stack & Apps',
    })
  }

  const highImpactCount = findings.filter((f) => f.impact === 'High').length

  return {
    sectionTitle: 'Tech Stack & Apps',
    eli5Summary: techStack.platform
      ? `The site runs on ${techStack.platform} with ${techStack.detectedApps.length} technologies detected.`
      : `${techStack.detectedApps.length} technologies detected on the site.`,
    whyItMatters: 'The right tech stack powers growth. Analytics, SEO tools, and performance monitoring drive improvement.',
    overallRating: highImpactCount >= 2 ? 'Critical' : highImpactCount >= 1 ? 'Needs Work' : 'Good',
    score: highImpactCount >= 2 ? 30 : highImpactCount >= 1 ? 60 : 85,
    findings,
  }
}

// --- AI-enhanced analysis ---

function buildPrompt(data: CollectedData): string {
  const { techStack } = data

  if (!techStack) return ''

  return `You are a web technology analyst. Analyse this website's tech stack and return findings.

DATA:
- Platform: ${techStack.platform ?? 'not detected'}
- Theme: ${techStack.theme ?? 'not detected'}
- Detected apps (${techStack.detectedApps.length}): ${techStack.detectedApps.map((a) => `${a.name} [${a.category}]${a.version ? ` v${a.version}` : ''}`).join('; ') || 'none'}
- Third-party scripts (${techStack.thirdPartyCount}): ${techStack.thirdPartyScripts.slice(0, 10).map((s) => `${s.domain}${s.purpose ? ` (${s.purpose})` : ''}`).join('; ') || 'none'}

RULES:
- sectionTitle must be "Tech Stack & Apps"
- Every finding must cite real data as evidence
- section must be "Tech Stack & Apps" for all findings
- Check: platform currency, missing essential tools (analytics, SEO, security), third-party script bloat, outdated versions
- Recommend missing essentials: analytics, form builder, SEO plugin, caching, CDN, security monitoring
- Rating: Good (has essentials, lean stack), Needs Work (1-2 missing essentials), Critical (no analytics + other gaps)
- Score: 0-100 based on stack completeness and health
- Use English spelling (analyse, colour, organisation). No slang, no colloquialisms, no em dashes.`
}

async function callOpenAi(data: CollectedData): Promise<AnalysisResult> {
  const client = getOpenAiClient()
  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    instructions: 'You are a web technology analyst. Return structured findings.',
    input: [{ role: 'user', content: buildPrompt(data) }],
    text: {
      format: {
        type: 'json_schema',
        name: 'tech_stack_analysis',
        strict: true,
        schema: zodToJsonSchema(AnalysisResultSchema) as Record<string, unknown>,
      },
    },
    temperature: 0.4,
    store: false,
  })
  return JSON.parse(response.output_text)
}

async function callGeminiFallback(data: CollectedData): Promise<AnalysisResult> {
  const client = getGeminiClient()
  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: buildPrompt(data) }] }],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: zodToJsonSchema(AnalysisResultSchema) as Record<string, unknown>,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  })
  return JSON.parse(response.text ?? '{}')
}

export async function analyseTechStack(
  data: CollectedData,
): Promise<AnalysisResult> {
  if (!data.techStack) {
    return buildHeuristicResult(data)
  }

  try {
    return await callOpenAi(data)
  } catch {
    try {
      return await callGeminiFallback(data)
    } catch {
      return buildHeuristicResult(data)
    }
  }
}
