import { zodToJsonSchema } from 'zod-to-json-schema'
import { ThinkingLevel } from '@google/genai'
import { getGeminiClient, getOpenAiClient } from '@/lib/ai'
import { AnalysisResultSchema } from '@/lib/types'
import type { CollectedData, AnalysisResult } from '@/lib/types'

function buildPrompt(data: CollectedData, hostname: string): string {
  const { lighthouse, html } = data
  const m = lighthouse.mobile
  const d = lighthouse.desktop

  return `You are a web performance analyst. Analyse this Lighthouse data and return findings.

SITE: ${hostname}

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
- evidence must state the exact metric and threshold. Bad: "LCP is slow". Good: "Mobile LCP: ${m.lcp.toFixed(2)}s (threshold: 2.5s)"
- evidenceType must be "METRIC" for all findings
- section must be "Performance & Speed" for all findings
- Rating: Good (mobile perf ≥ 80), Needs Work (40-79), Critical (< 40)
- Score: map directly from the mobile performance score (0-100)
- Include findings for LCP, TBT, CLS, FCP at minimum if they exceed thresholds
- LCP good < 2.5s, TBT good < 200ms, CLS good < 0.1, FCP good < 1.8s
- Use English spelling (analyse, colour, organisation). No slang, no colloquialisms, no em dashes.
- eli5Summary must NOT start with "The website" or "The site". Must reference ${hostname}'s specific scores. Bad: "Page speed needs improvement". Good: "Mobile pages on ${hostname} take ${m.lcp.toFixed(1)}s to show the main content, nearly double the 2.5s target".`
}

async function callGemini(data: CollectedData, hostname: string): Promise<AnalysisResult> {
  const client = getGeminiClient()
  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: buildPrompt(data, hostname) }] }],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: zodToJsonSchema(AnalysisResultSchema) as Record<string, unknown>,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  })
  return JSON.parse(response.text ?? '{}')
}

async function callOpenAiFallback(data: CollectedData, hostname: string): Promise<AnalysisResult> {
  const client = getOpenAiClient()
  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    instructions: 'You are a web performance analyst. Return structured JSON.',
    input: [{ role: 'user', content: buildPrompt(data, hostname) }],
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
  hostname: string,
): Promise<AnalysisResult> {
  try {
    return await callGemini(data, hostname)
  } catch {
    try {
      return await callGemini(data, hostname)
    } catch {
      return await callOpenAiFallback(data, hostname)
    }
  }
}
