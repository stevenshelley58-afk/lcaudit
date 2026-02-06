import { zodToJsonSchema } from 'zod-to-json-schema'
import { getOpenAiClient, getGeminiClient } from '@/lib/ai'
import { AnalysisResultSchema } from '@/lib/types'
import type { CollectedData, AnalysisResult, Finding } from '@/lib/types'

// --- Heuristic fallback ---

function buildHeuristicResult(data: CollectedData): AnalysisResult {
  const { ogTags, twitterCard, favicon } = data.html
  const findings: Finding[] = []

  findings.push({
    id: 'social-001',
    title: ogTags.title ? 'Open Graph title is set' : 'Missing Open Graph title',
    description: ogTags.title
      ? 'Your page has a proper title for social sharing.'
      : "When someone shares your link on Facebook, LinkedIn, or Slack, there won't be a proper title displayed.",
    evidence: ogTags.title ? `og:title = "${ogTags.title}"` : 'No og:title meta tag found',
    evidenceType: ogTags.title ? 'HTML' : 'MISSING',
    evidenceDetail: ogTags.title ? 'meta[property="og:title"]' : 'head > meta[property="og:title"] expected',
    impact: ogTags.title ? 'Low' : 'High',
    fix: ogTags.title
      ? 'No action needed.'
      : 'Add <meta property="og:title" content="Your Page Title"> to the <head>.',
    category: 'Open Graph',
    section: 'Social & Sharing',
  })

  if (!ogTags.description) {
    findings.push({
      id: 'social-002',
      title: 'Missing Open Graph description',
      description: "Shared links won't show a description preview, reducing click-through rates.",
      evidence: 'No og:description meta tag found',
      evidenceType: 'MISSING',
      evidenceDetail: 'head > meta[property="og:description"] expected',
      impact: 'Medium',
      fix: 'Add <meta property="og:description" content="A compelling description..."> to the <head>.',
      category: 'Open Graph',
      section: 'Social & Sharing',
    })
  }

  findings.push({
    id: 'social-003',
    title: ogTags.image ? 'Open Graph image is set' : 'Missing Open Graph image',
    description: ogTags.image
      ? 'Your page has a social sharing image configured.'
      : 'Shared links will show a generic placeholder instead of an eye-catching image.',
    evidence: ogTags.image ? `og:image = "${ogTags.image}"` : 'No og:image meta tag found',
    evidenceType: ogTags.image ? 'HTML' : 'MISSING',
    evidenceDetail: ogTags.image ? 'meta[property="og:image"]' : 'head > meta[property="og:image"] expected',
    impact: ogTags.image ? 'Low' : 'High',
    fix: ogTags.image
      ? 'Ensure the image is at least 1200x630 pixels.'
      : 'Add <meta property="og:image" content="https://yoursite.com/og-image.jpg">. Recommended: 1200x630px.',
    category: 'Open Graph',
    section: 'Social & Sharing',
  })

  if (!twitterCard.card) {
    findings.push({
      id: 'social-004',
      title: 'No Twitter Card configured',
      description: 'Links shared on X (Twitter) will use a basic text preview instead of a rich card.',
      evidence: 'No twitter:card meta tag found',
      evidenceType: 'MISSING',
      evidenceDetail: 'head > meta[name="twitter:card"] expected',
      impact: 'Medium',
      fix: 'Add <meta name="twitter:card" content="summary_large_image">.',
      category: 'Twitter Card',
      section: 'Social & Sharing',
    })
  }

  if (!favicon) {
    findings.push({
      id: 'social-005',
      title: 'No favicon detected',
      description: "Your site doesn't have a favicon — the small icon in browser tabs. This looks unprofessional.",
      evidence: 'No favicon link tag or favicon.ico found',
      evidenceType: 'MISSING',
      evidenceDetail: 'head > link[rel="icon"] expected',
      impact: 'Medium',
      fix: 'Add a favicon.ico and a <link rel="icon"> tag.',
      category: 'Branding',
      section: 'Social & Sharing',
    })
  }

  const missingCount = findings.filter((f) => f.evidenceType === 'MISSING').length

  return {
    sectionTitle: 'Social & Sharing',
    eli5Summary: missingCount >= 3
      ? "When people share your website link on social media, it looks bare — no image, no description."
      : missingCount >= 1
        ? 'Your social sharing setup is partially complete but missing some key elements.'
        : 'Your social sharing tags are well-configured.',
    whyItMatters: 'Social sharing is free marketing. A well-configured preview card can dramatically increase click-through rates.',
    overallRating: missingCount >= 3 ? 'Critical' : missingCount >= 1 ? 'Needs Work' : 'Good',
    score: missingCount >= 3 ? 25 : missingCount >= 1 ? 60 : 90,
    findings,
  }
}

// --- AI-enhanced analysis ---

function buildPrompt(data: CollectedData): string {
  const { ogTags, twitterCard, favicon } = data.html

  return `You are a social media and sharing specialist. Analyse this website's social sharing setup.

DATA:
- og:title: ${ogTags.title ? `"${ogTags.title}"` : 'MISSING'}
- og:description: ${ogTags.description ? `"${ogTags.description}"` : 'MISSING'}
- og:image: ${ogTags.image ?? 'MISSING'}
- og:type: ${ogTags.type ?? 'MISSING'}
- og:url: ${ogTags.url ?? 'MISSING'}
- twitter:card: ${twitterCard.card ?? 'MISSING'}
- twitter:title: ${twitterCard.title ?? 'MISSING'}
- twitter:description: ${twitterCard.description ?? 'MISSING'}
- twitter:image: ${twitterCard.image ?? 'MISSING'}
- Favicon: ${favicon ?? 'MISSING'}

RULES:
- sectionTitle must be "Social & Sharing"
- Every finding must cite real data as evidence
- section must be "Social & Sharing" for all findings
- Check: og:title, og:description, og:image (and size recommendation), og:type, twitter:card, twitter:image, favicon
- Also check quality: is the og:description compelling? Is the og:title different from the page title? Is og:image a proper social image or just a logo?
- Rating: Good (all essentials present), Needs Work (1-2 missing), Critical (3+ missing)
- Score: 0-100 based on completeness and quality
- Use Australian English`
}

async function callOpenAi(data: CollectedData): Promise<AnalysisResult> {
  const client = getOpenAiClient()
  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    instructions: 'You are a social media sharing specialist. Return structured findings.',
    input: [{ role: 'user', content: buildPrompt(data) }],
    text: {
      format: {
        type: 'json_schema',
        name: 'social_analysis',
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
      thinkingConfig: { thinkingLevel: 'LOW' },
    },
  })
  return JSON.parse(response.text ?? '{}')
}

export async function analyseSocial(
  data: CollectedData,
): Promise<AnalysisResult> {
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
