import { zodToJsonSchema } from 'zod-to-json-schema'
import { ThinkingLevel } from '@google/genai'
import { getGeminiClient, getOpenAiClient } from '@/lib/ai'
import { AnalysisResultSchema } from '@/lib/types'
import type { CollectedData, AnalysisResult } from '@/lib/types'

function buildPrompt(data: CollectedData): string {
  const { lighthouse, html } = data
  const m = lighthouse.mobile
  const d = lighthouse.desktop

  return `You are a web performance analyst. Analyse this Lighthouse data and return findings.

DATA:
- Mobile scores: Performance ${m.performance}/100, Accessibility ${m.accessibility}/100, Best Practices ${m.bestPractices}/100, SEO ${m.seo}/100
- Desktop scores: Performance ${d.performance}/100, Accessibility ${d.accessibility}/100, Best Practices ${d.bestPractices}/100, SEO ${d.seo}/100
- Mobile CWV: LCP ${m.lcp.toFixed(2)}s, CLS ${m.cls}, TBT ${m.tbt}ms, FCP ${m.fcp.toFixed(2)}s, SI ${m.si.toFixed(2)}s, TTI ${m.tti.toFixed(2)}s
- Desktop CWV: LCP ${d.lcp.toFixed(2)}s, CLS ${d.cls}, TBT ${d.tbt}ms, FCP ${d.fcp.toFixed(2)}s, SI ${d.si.toFixed(2)}s, TTI ${d.tti.toFixed(2)}s
- Image count: ${html.images.length}
- Diagnostics: ${lighthouse.diagnostics.slice(0, 15).map((d) => `${d.title} (score: ${d.score})`).join('; ')}

RULES:
- sectionTitle must be "Performance & Speed"
- Every finding must cite a real metric from the data above as evidence
- evidenceType must be "METRIC" for all findings
- section must be "Performance & Speed" for all findings
- Rating: Good (mobile perf ≥ 80), Needs Work (40-79), Critical (< 40)
- Score: map directly from the mobile performance score (0-100)
- Include findings for LCP, TBT, CLS, FCP at minimum if they exceed thresholds
- LCP good < 2.5s, TBT good < 200ms, CLS good < 0.1, FCP good < 1.8s
- Use English spelling (analyse, colour, organisation). No slang, no colloquialisms, no em dashes.
- eli5Summary must NOT start with "The website" or "The site". Vary your opening - lead with the key finding (e.g. "Desktop loads fast but mobile struggles...", "Page speed is solid across devices...", "Slow load times are hurting...").`
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
    instructions: 'You are a web performance analyst. Return structured JSON.',
    input: [{ role: 'user', content: buildPrompt(data) }],
    text: {
      format: {
        type: 'json_schema',
        name: 'performance_analysis',
        strict: true,
        schema: zodToJsonSchema(AnalysisResultSchema) as Record<string, unknown>,
      },
    },
    temperature: 0.4,
    store: false,
  })
  return JSON.parse(response.output_text)
}

export async function analysePerformance(
  data: CollectedData,
): Promise<AnalysisResult> {
  try {
    return await callGemini(data)
  } catch (geminiError) {
    try {
      return await callGemini(data)
    } catch {
      return await callOpenAiFallback(data)
    }
  }
}
