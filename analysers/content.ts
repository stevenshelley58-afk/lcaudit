import { zodToJsonSchema } from 'zod-to-json-schema'
import { ThinkingLevel } from '@google/genai'
import { getGeminiClient, getOpenAiClient } from '@/lib/ai'
import { AnalysisResultSchema } from '@/lib/types'
import type { CollectedData, AnalysisResult, Finding } from '@/lib/types'

// --- Heuristic fallback ---

function buildHeuristicResult(data: CollectedData): AnalysisResult {
  const { html, linkCheck } = data
  const { wordCount, headings, forms, links } = html
  const totalHeadings = headings.h1.length + headings.h2.length + headings.h3.length
  const findings: Finding[] = []

  // Word count
  if (wordCount < 300) {
    findings.push({
      id: 'content-001', title: 'Very thin content',
      description: 'The page has very little text content.',
      evidence: `Word count: ${wordCount} (recommended minimum: 300)`,
      evidenceType: 'METRIC', evidenceDetail: 'Word count', impact: 'High',
      fix: 'Add more meaningful content. Aim for at least 300 words on key pages.',
      category: 'Content Depth', section: 'Content & Conversion',
    })
  } else if (wordCount > 3000) {
    findings.push({
      id: 'content-001', title: 'Content may be too long for a landing page',
      description: 'Very long pages can overwhelm visitors.',
      evidence: `Word count: ${wordCount}`,
      evidenceType: 'METRIC', evidenceDetail: 'Word count', impact: 'Low',
      fix: 'Consider breaking into multiple pages or using tabbed layouts.',
      category: 'Content Depth', section: 'Content & Conversion',
    })
  } else {
    findings.push({
      id: 'content-001', title: 'Adequate content length',
      description: 'The page has a reasonable amount of content.',
      evidence: `Word count: ${wordCount}`,
      evidenceType: 'METRIC', evidenceDetail: 'Word count', impact: 'Low',
      fix: 'No action needed.',
      category: 'Content Depth', section: 'Content & Conversion',
    })
  }

  if (totalHeadings < 3 && wordCount > 500) {
    findings.push({
      id: 'content-002', title: 'Content lacks structure',
      description: 'Long content without headings is hard to scan.',
      evidence: `Only ${totalHeadings} headings found for ${wordCount} words`,
      evidenceType: 'METRIC', evidenceDetail: 'Heading count vs word count', impact: 'Medium',
      fix: 'Add H2 and H3 headings every 200-300 words.',
      category: 'Structure', section: 'Content & Conversion',
    })
  }

  findings.push({
    id: 'content-003',
    title: forms === 0 ? 'No forms or conversion points found' : `${forms} form${forms > 1 ? 's' : ''} detected`,
    description: forms === 0
      ? 'The page has no forms — visitors have no way to take action.'
      : `The page has ${forms} form element${forms > 1 ? 's' : ''}.`,
    evidence: forms === 0 ? 'Zero <form> elements detected' : `${forms} <form> element${forms > 1 ? 's' : ''} found`,
    evidenceType: forms === 0 ? 'MISSING' : 'HTML',
    evidenceDetail: forms === 0 ? 'form elements expected' : 'form',
    impact: forms === 0 ? 'High' : 'Low',
    fix: forms === 0 ? 'Add at least one call-to-action: a contact form, email signup, or clear button.' : 'Ensure forms are mobile-friendly.',
    category: 'Conversion', section: 'Content & Conversion',
  })

  if (links.internal.length < 3) {
    findings.push({
      id: 'content-004', title: 'Very few internal links',
      description: 'Internal links help visitors explore and help search engines understand your site.',
      evidence: `Only ${links.internal.length} internal links found`,
      evidenceType: 'METRIC', evidenceDetail: 'Internal link count', impact: 'Medium',
      fix: 'Add contextual internal links to related pages.',
      category: 'Navigation', section: 'Content & Conversion',
    })
  }

  if (linkCheck && linkCheck.broken.length > 0) {
    findings.push({
      id: 'content-005',
      title: `${linkCheck.broken.length} broken link${linkCheck.broken.length > 1 ? 's' : ''} found`,
      description: 'Broken links frustrate visitors and hurt SEO.',
      evidence: linkCheck.broken.slice(0, 5).map((bl) => `${bl.url} → ${bl.statusCode}`).join(', '),
      evidenceType: 'HEADER', evidenceDetail: 'HTTP status code', impact: 'High',
      fix: 'Fix or remove each broken link.',
      category: 'Links', section: 'Content & Conversion',
    })
  }

  const highImpactCount = findings.filter((f) => f.impact === 'High').length

  return {
    sectionTitle: 'Content & Conversion',
    eli5Summary: highImpactCount >= 2
      ? "Your website content needs significant work — it's either too thin, poorly structured, or missing clear calls to action."
      : highImpactCount >= 1
        ? 'Your content is mostly there but has some gaps.'
        : 'Your content is well-structured with good length and clear conversion points.',
    whyItMatters: 'Content is what convinces visitors to become customers.',
    overallRating: highImpactCount >= 2 ? 'Critical' : highImpactCount >= 1 ? 'Needs Work' : 'Good',
    score: highImpactCount >= 2 ? 30 : highImpactCount >= 1 ? 55 : 85,
    findings,
  }
}

// --- AI-enhanced analysis ---

function buildPrompt(data: CollectedData): string {
  const { html, linkCheck } = data
  const { wordCount, headings, forms, links } = html

  return `You are a content strategy and conversion rate optimisation specialist. Analyse this website data.

DATA:
- Word count: ${wordCount}
- H1 (${headings.h1.length}): ${headings.h1.map((h) => `"${h}"`).join(', ') || 'NONE'}
- H2 (${headings.h2.length}): ${headings.h2.slice(0, 8).map((h) => `"${h}"`).join(', ') || 'NONE'}
- H3 (${headings.h3.length}): ${headings.h3.slice(0, 5).map((h) => `"${h}"`).join(', ') || 'NONE'}
- Forms: ${forms}
- Internal links: ${links.internal.length}
- External links: ${links.external.length}
- Broken links: ${linkCheck ? linkCheck.broken.length : 'not checked'}${linkCheck && linkCheck.broken.length > 0 ? ` (${linkCheck.broken.slice(0, 5).map((b) => `${b.url} → ${b.statusCode}`).join('; ')})` : ''}
- Redirecting links: ${linkCheck ? linkCheck.redirects.length : 'not checked'}
- Images: ${html.images.length}

RULES:
- sectionTitle must be "Content & Conversion"
- Every finding must cite real data as evidence
- section must be "Content & Conversion" for all findings
- Analyse: content depth (thin < 300 words), heading structure, conversion opportunities (forms, CTAs), internal linking quality, broken links, content readability
- Judge the heading TEXT quality — do H2s tell a story? Are they keyword-rich? Are they just "About Us" boilerplate?
- Rating: Good (substantial content, clear CTAs), Needs Work (gaps in content or conversion), Critical (thin content + no forms)
- Score: 0-100
- Use Australian English`
}

async function callGemini(data: CollectedData): Promise<AnalysisResult> {
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

async function callOpenAiFallback(data: CollectedData): Promise<AnalysisResult> {
  const client = getOpenAiClient()
  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    instructions: 'You are a content strategy and CRO specialist. Return structured findings.',
    input: [{ role: 'user', content: buildPrompt(data) }],
    text: {
      format: {
        type: 'json_schema',
        name: 'content_analysis',
        strict: true,
        schema: zodToJsonSchema(AnalysisResultSchema) as Record<string, unknown>,
      },
    },
    temperature: 0.4,
    store: false,
  })
  return JSON.parse(response.output_text)
}

export async function analyseContent(
  data: CollectedData,
): Promise<AnalysisResult> {
  try {
    return await callGemini(data)
  } catch {
    try {
      return await callOpenAiFallback(data)
    } catch {
      return buildHeuristicResult(data)
    }
  }
}
