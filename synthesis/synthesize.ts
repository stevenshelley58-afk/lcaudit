import { zodToJsonSchema } from 'zod-to-json-schema'
import { getOpenAiClient, getGeminiClient } from '@/lib/ai'
import { withTimeout } from '@/lib/utils'
import { SynthesisResultSchema } from '@/lib/types'
import type { AnalysisResult, SynthesisResult } from '@/lib/types'

const SYNTHESIS_TIMEOUT_MS = 30_000

function buildInput(
  hostname: string,
  analyses: readonly AnalysisResult[],
): string {
  const sections = analyses.map((a) => ({
    section: a.sectionTitle,
    rating: a.overallRating,
    score: a.score,
    findingCount: a.findings.length,
    highImpactFindings: a.findings
      .filter((f) => f.impact === 'High')
      .map((f) => ({ title: f.title, evidence: f.evidence })),
    eli5: a.eli5Summary,
  }))

  return JSON.stringify({ hostname, sections })
}

const SYSTEM_PROMPT = `You are a web audit report writer. Write for a business owner with zero technical knowledge. Australian English.

TASK:
1. executiveSummary: 3-5 sentences. Zero jargon. What's working, what's broken, what to fix first. Speak directly to the business owner.
2. overallScore: 0-100 weighted average. Visual/Performance weigh 1.5x. Social/Tech Stack weigh 0.75x. Sections with "Error" rating are excluded. Round to nearest integer.
3. topFixes: Top 5 fixes ranked by business impact. Each needs title, section, impact level, and a plain-English description of what to do.

RULES:
- Discard any finding without evidence
- If a section has "Error" rating, mention it briefly ("We couldn't check X") but don't let it tank the score
- topFixes descriptions must be actionable — not "improve SEO" but "add a meta description between 120-160 characters"
- impact must be one of: "High", "Medium", "Low"`

async function callGpt5(
  hostname: string,
  analyses: readonly AnalysisResult[],
): Promise<SynthesisResult> {
  const client = getOpenAiClient()
  const response = await withTimeout(
    client.responses.create({
      model: 'gpt-5',
      instructions: SYSTEM_PROMPT,
      input: [{ role: 'user', content: buildInput(hostname, analyses) }],
      reasoning: { effort: 'medium' },
      text: {
        format: {
          type: 'json_schema',
          name: 'synthesis_result',
          strict: true,
          schema: zodToJsonSchema(SynthesisResultSchema) as Record<string, unknown>,
        },
      },
      store: false,
      max_output_tokens: 4096,
    }),
    SYNTHESIS_TIMEOUT_MS,
    'synthesis-gpt5',
  )
  return JSON.parse(response.output_text)
}

async function callGeminiFallback(
  hostname: string,
  analyses: readonly AnalysisResult[],
): Promise<SynthesisResult> {
  const client = getGeminiClient()
  const response = await withTimeout(
    client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildInput(hostname, analyses)}` }],
      }],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(SynthesisResultSchema) as Record<string, unknown>,
      },
    }),
    SYNTHESIS_TIMEOUT_MS,
    'synthesis-gemini-flash',
  )
  const text = response.text
  if (!text) throw new Error('Gemini Flash returned empty response')
  return SynthesisResultSchema.parse(JSON.parse(text))
}

export async function synthesize(
  hostname: string,
  analyses: readonly AnalysisResult[],
): Promise<SynthesisResult> {
  try {
    return await callGpt5(hostname, analyses)
  } catch (err) {
    console.log(`[synthesis] GPT-5 failed: ${(err as Error).message} — falling back to Gemini Flash`)
    return await callGeminiFallback(hostname, analyses)
  }
}
