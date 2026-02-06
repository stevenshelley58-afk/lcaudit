import { zodToJsonSchema } from 'zod-to-json-schema'
import { getGeminiClient, getOpenAiClient } from '@/lib/ai'
import { AnalysisResultSchema } from '@/lib/types'
import type { CollectedData, AnalysisResult } from '@/lib/types'

function buildPrompt(data: CollectedData): string {
  const { lighthouse, html } = data
  const a11yScore = lighthouse.mobile.accessibility
  const missingAlt = html.images.filter((img) => !img.alt).length
  const a11yDiagnostics = lighthouse.diagnostics
    .filter((d) => d.score !== null && d.score < 1)
    .slice(0, 15)

  return `You are a web accessibility specialist (WCAG 2.1 AA). Analyse this data and return findings.

DATA:
- Lighthouse accessibility score: ${a11yScore}/100
- Images: ${html.images.length} total, ${missingAlt} missing alt text
- H1 count: ${html.headings.h1.length}, H2 count: ${html.headings.h2.length}, H3 count: ${html.headings.h3.length}
- H1 text: ${html.headings.h1.map((h) => `"${h}"`).join(', ') || 'NONE'}
- Page language: ${html.language ?? 'NOT SET'}
- Forms: ${html.forms}
- Viewport: ${html.viewport ?? 'NOT SET'}
- Failing diagnostics: ${a11yDiagnostics.length > 0 ? a11yDiagnostics.map((d) => d.title).join('; ') : 'none detected'}

CRITICAL RULE FOR RATING:
Even if the Lighthouse score is high (e.g. 90+), you MUST cap the rating at "Needs Work" and the score at 65 if ANY of these are true:
- More than 3 images missing alt text
- No H1 heading exists
- Page language is not set
- No viewport meta tag
These are High-impact WCAG failures that Lighthouse sometimes underweights.

RULES:
- sectionTitle must be "Accessibility"
- Every finding must cite real data as evidence
- section must be "Accessibility" for all findings
- Check: alt text, heading hierarchy, language attribute, form labels, colour contrast (from diagnostics), viewport
- Rating: Good (score ≥ 90 AND no High-impact failures), Needs Work (score 50-89 OR High-impact failures), Critical (score < 50)
- Score: 0-100, adjusted down from Lighthouse score if High-impact issues found
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
      thinkingConfig: { thinkingLevel: 'LOW' },
    },
  })
  return JSON.parse(response.text ?? '{}')
}

async function callOpenAiFallback(data: CollectedData): Promise<AnalysisResult> {
  const client = getOpenAiClient()
  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    instructions: 'You are a web accessibility specialist (WCAG 2.1 AA). Return structured findings.',
    input: [{ role: 'user', content: buildPrompt(data) }],
    text: {
      format: {
        type: 'json_schema',
        name: 'accessibility_analysis',
        strict: true,
        schema: zodToJsonSchema(AnalysisResultSchema) as Record<string, unknown>,
      },
    },
    temperature: 0.4,
    store: false,
  })
  return JSON.parse(response.output_text)
}

export async function analyseAccessibility(
  data: CollectedData,
): Promise<AnalysisResult> {
  try {
    return await callGemini(data)
  } catch {
    try {
      return await callGemini(data)
    } catch {
      return await callOpenAiFallback(data)
    }
  }
}
