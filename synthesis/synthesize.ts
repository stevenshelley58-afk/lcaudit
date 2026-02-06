import { zodToJsonSchema } from 'zod-to-json-schema'
import { getOpenAiClient, getAnthropicClient } from '@/lib/ai'
import { SynthesisResultSchema } from '@/lib/types'
import type { AnalysisResult, SynthesisResult } from '@/lib/types'

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
  const response = await client.responses.create({
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
  })
  return JSON.parse(response.output_text)
}

async function callClaudeFallback(
  hostname: string,
  analyses: readonly AnalysisResult[],
): Promise<SynthesisResult> {
  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: SYSTEM_PROMPT + '\n\nReturn ONLY valid JSON matching this schema: { executiveSummary: string, overallScore: number (0-100), topFixes: Array<{ title: string, section: string, impact: string, description: string }> }',
    messages: [{ role: 'user', content: buildInput(hostname, analyses) }],
  })

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => ('text' in block ? block.text : ''))
    .join('')

  // Extract JSON from response (Claude may wrap in markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Claude response did not contain valid JSON')
  }

  return SynthesisResultSchema.parse(JSON.parse(jsonMatch[0]))
}

export async function synthesize(
  hostname: string,
  analyses: readonly AnalysisResult[],
): Promise<SynthesisResult> {
  try {
    return await callGpt5(hostname, analyses)
  } catch {
    try {
      return await callGpt5(hostname, analyses)
    } catch {
      return await callClaudeFallback(hostname, analyses)
    }
  }
}
