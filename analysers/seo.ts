import { zodToJsonSchema } from 'zod-to-json-schema'
import { ThinkingLevel } from '@google/genai'
import { getOpenAiClient, getGeminiClient } from '@/lib/ai'
import { AnalysisResultSchema } from '@/lib/types'
import type { CollectedData, AnalysisResult } from '@/lib/types'

function buildPrompt(data: CollectedData, hostname: string): string {
  const { html, robots, sitemap, serp } = data
  const missingAlt = html.images.filter((img) => !img.alt).length

  return `You are an SEO specialist. Analyse this website data and return findings.

SITE: ${hostname}

DATA:
- Title: ${html.title ? `"${html.title}" (${html.title.length} chars)` : 'MISSING'}
- Meta description: ${html.metaDescription ? `"${html.metaDescription}" (${html.metaDescription.length} chars)` : 'MISSING'}
- Canonical URL: ${html.canonicalUrl ?? 'MISSING'}
- H1 headings (${html.headings.h1.length}): ${html.headings.h1.map((h) => `"${h}"`).join(', ') || 'NONE'}
- H2 headings (${html.headings.h2.length}): ${html.headings.h2.slice(0, 10).map((h) => `"${h}"`).join(', ') || 'NONE'}
- H3 headings (${html.headings.h3.length}): ${html.headings.h3.slice(0, 5).map((h) => `"${h}"`).join(', ') || 'NONE'}
- Images: ${html.images.length} total, ${missingAlt} missing alt text
- Links: ${html.links.internal.length} internal, ${html.links.external.length} external
- Schema.org: ${html.schemaOrg.length > 0 ? `${html.schemaOrg.length} objects found` : 'NONE'}
- Viewport: ${html.viewport ?? 'MISSING'}
- Language: ${html.language ?? 'MISSING'}
- Robots.txt: ${robots ? (robots.exists ? `exists, ${robots.disallowRules.length} disallow rules` : 'not found') : 'collector failed'}
- Sitemap: ${sitemap ? (sitemap.exists ? `exists, ${sitemap.urlCount} URLs` : 'not found') : 'collector failed'}
- SERP: ${serp ? `${serp.indexedPages ?? 'unknown'} indexed pages, brand search ${serp.brandSearchPresent ? 'found' : 'not found'}` : 'collector failed'}
${serp?.homepageSnippet ? `- SERP snippet: "${serp.homepageSnippet}"` : ''}

RULES:
- sectionTitle must be "SEO & Keywords"
- Every finding must cite real data from above as evidence
- evidence must quote the actual value. Bad: "Title is too short". Good: "Title: '${html.title ?? ''}' (${html.title?.length ?? 0} chars) - below the 50-60 char ideal"
- section must be "SEO & Keywords" for all findings
- fix must reference the site's current content. Bad: "Add a meta description". Good: "Write a 120-160 char description of what ${hostname} offers"
- Check: title length (50-60 ideal), meta desc (120-160), H1 count (exactly 1), heading hierarchy, canonical, structured data, alt text, sitemap, robots.txt, internal linking, viewport
- Rating: Good (minor issues only), Needs Work (2+ medium issues), Critical (missing title OR no H1 OR not indexed)
- Score: 0-100 based on severity of issues found
- If multiple H1s exist, that is a finding (not "No H1 found")
- Use English spelling (analyse, colour, organisation). No slang, no colloquialisms, no em dashes.
- eli5Summary must NOT start with "The website" or "The site". Must reference actual SEO data from ${hostname}. Bad: "Good foundations with a few gaps". Good: "Google sees '${html.title ?? hostname}' as the page title, but with no meta description, search results show a random snippet instead of a compelling pitch".`
}

async function callOpenAi(data: CollectedData, hostname: string): Promise<AnalysisResult> {
  const client = getOpenAiClient()
  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    instructions: 'You are an SEO specialist analysing a website. Return structured findings with evidence.',
    input: [{ role: 'user', content: buildPrompt(data, hostname) }],
    text: {
      format: {
        type: 'json_schema',
        name: 'seo_analysis',
        strict: true,
        schema: zodToJsonSchema(AnalysisResultSchema) as Record<string, unknown>,
      },
    },
    temperature: 0.4,
    store: false,
  })
  return JSON.parse(response.output_text)
}

async function callGeminiFallback(data: CollectedData, hostname: string): Promise<AnalysisResult> {
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

export async function analyseSeo(
  data: CollectedData,
  hostname: string,
): Promise<AnalysisResult> {
  try {
    return await callOpenAi(data, hostname)
  } catch {
    try {
      return await callOpenAi(data, hostname)
    } catch {
      return await callGeminiFallback(data, hostname)
    }
  }
}
