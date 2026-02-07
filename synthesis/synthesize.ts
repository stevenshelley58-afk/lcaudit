import { zodToJsonSchema } from 'zod-to-json-schema'
import { getOpenAiClient, getGeminiClient } from '@/lib/ai'
import { withTimeout } from '@/lib/utils'
import { SynthesisResultSchema } from '@/lib/types'
import type { AnalysisResult, SynthesisResult, CollectedData } from '@/lib/types'

const SYNTHESIS_TIMEOUT_MS = 30_000

function buildInput(
  hostname: string,
  analyses: readonly AnalysisResult[],
  collectedData: CollectedData,
): string {
  const sections = analyses.map((a) => ({
    section: a.sectionTitle,
    rating: a.overallRating,
    score: a.score,
    findingCount: a.findings.length,
    highImpactFindings: a.findings
      .filter((f) => f.impact === 'High')
      .map((f) => ({ title: f.title, evidence: f.evidence, fix: f.fix })),
    eli5: a.eli5Summary,
  }))

  const siteContext = {
    hostname,
    pageTitle: collectedData.html.title ?? null,
    h1: collectedData.html.headings.h1[0] ?? null,
    platform: collectedData.techStack?.platform ?? null,
    wordCount: collectedData.html.wordCount,
    mobilePerformance: collectedData.lighthouse.mobile.performance,
  }

  return JSON.stringify({ siteContext, sections })
}

const SYSTEM_PROMPT = `You are a web audit report writer. Write for a business owner with zero technical knowledge. English spelling (analyse, colour, organisation). No slang, no colloquialisms, no em dashes.

TASK:
1. executiveSummary: 2-3 short sentences. Conversational, like explaining to a friend who owns a business. No jargon.
2. overallScore: 0-100 weighted average. Visual/Performance weigh 1.5x. Social/Tech Stack weigh 0.75x. Sections with "Error" rating are excluded. Round to nearest integer.
3. topFixes: Top 5 fixes ranked by business impact. Each needs title, section, impact level, and a plain-English description of what to do.

RULES:
- NEVER use technical terms in the executiveSummary. Banned words: LCP, FCP, CLS, TBT, TTI, alt text, H1, H2, meta description, CSP, HSTS, Content-Security-Policy, structured data, canonical, viewport, schema.org, Largest Contentful Paint, First Contentful Paint, cumulative layout shift, render-blocking. Translate everything to plain impact.
- Convert all millisecond values to seconds (rounded to nearest whole number) before writing. Never output raw ms values. "Pages take 6 seconds to load" not "LCP is 5881ms". "Images have no descriptions for screen readers" not "alt text is missing". "No main headline on the page" not "missing H1".
- executiveSummary must NOT start with "The website" or "The site". Reference the site by name. Mention what it does or sells if the data reveals it. Then state the single biggest problem in plain English and why it matters to the business.
- Discard any finding without evidence
- If a section has "Error" rating, mention it briefly ("We couldn't check X") but don't let it tank the score
- topFixes descriptions must be actionable and reference the site's actual data - not "improve SEO" but "rewrite the meta description from 'current value' to a 120-160 char pitch for what the business offers"
- impact must be one of: "High", "Medium", "Low"`

async function callGpt5(
  hostname: string,
  analyses: readonly AnalysisResult[],
  collectedData: CollectedData,
): Promise<SynthesisResult> {
  const client = getOpenAiClient()
  const response = await withTimeout(
    client.responses.create({
      model: 'gpt-5',
      instructions: SYSTEM_PROMPT,
      input: [{ role: 'user', content: buildInput(hostname, analyses, collectedData) }],
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
  collectedData: CollectedData,
): Promise<SynthesisResult> {
  const client = getGeminiClient()
  const response = await withTimeout(
    client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildInput(hostname, analyses, collectedData)}` }],
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
  collectedData: CollectedData,
): Promise<SynthesisResult> {
  try {
    return await callGpt5(hostname, analyses, collectedData)
  } catch (err) {
    console.log(`[synthesis] GPT-5 failed: ${(err as Error).message}. Falling back to Gemini Flash`)
    return await callGeminiFallback(hostname, analyses, collectedData)
  }
}
