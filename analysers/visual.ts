import { zodToJsonSchema } from 'zod-to-json-schema'
import { ThinkingLevel, MediaResolution } from '@google/genai'
import { getGeminiAlphaClient, getOpenAiClient, fetchImageAsBase64 } from '@/lib/ai'
import { AnalysisResultSchema } from '@/lib/types'
import type { CollectedData, AnalysisResult } from '@/lib/types'

function buildPrompt(data: CollectedData): string {
  const { html } = data
  const imgCount = html.images.length
  const h1Count = html.headings.h1.length
  const h2Count = html.headings.h2.length

  return `You are a visual design and UX analyst. Analyse the two screenshots (desktop and mobile) of this website.

CONTEXT:
- Page has ${imgCount} images, ${h1Count} H1 headings, ${h2Count} H2 headings
- Word count: ${html.wordCount}

ANALYSE FOR:
1. Layout and visual hierarchy - is the most important content prominent?
2. Typography - readable font sizes, consistent type scale, line height
3. Mobile responsiveness - does the mobile version work well, not just shrink?
4. Colour contrast - can all text be read easily against backgrounds?
5. CTA visibility - are call-to-action buttons obvious and easy to find?
6. Image quality - are images sharp, properly cropped, not stretched?
7. Whitespace and breathing room - is the design cluttered or balanced?
8. Brand consistency - cohesive colour palette, consistent styling

RULES:
- sectionTitle must be "Visual & Design"
- Every finding must reference something specific you can see in the screenshots
- evidenceType must be "SCREENSHOT" for visual findings
- evidenceDetail must describe where in the screenshot you see the issue (e.g. "mobile - hero section", "desktop - navigation bar")
- section must be "Visual & Design" for all findings
- Rating: Good (polished, professional), Needs Work (functional but rough), Critical (major usability issues)
- Score: 0-100 based on overall visual quality
- Be specific - don't say "some issues", say exactly what you see
- Use English spelling (analyse, colour, organisation). No slang, no colloquialisms, no em dashes.
- eli5Summary must NOT start with "The website" or "The site". Vary your opening - lead with what stands out (e.g. "Clean layout but...", "Readability suffers from...", "A strong first impression, though...").`
}

async function callGeminiAlpha(data: CollectedData): Promise<AnalysisResult> {
  const client = getGeminiAlphaClient()

  const [desktop, mobile] = await Promise.all([
    fetchImageAsBase64(data.screenshots.desktop),
    fetchImageAsBase64(data.screenshots.mobile),
  ])

  const response = await client.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{
      parts: [
        { inlineData: { mimeType: desktop.mimeType, data: desktop.base64 } },
        { inlineData: { mimeType: mobile.mimeType, data: mobile.base64 } },
        { text: buildPrompt(data) },
      ],
    }],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: zodToJsonSchema(AnalysisResultSchema) as Record<string, unknown>,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
    },
  })

  return JSON.parse(response.text ?? '{}')
}

async function callOpenAiFallback(data: CollectedData): Promise<AnalysisResult> {
  const client = getOpenAiClient()

  const response = await client.responses.create({
    model: 'gpt-4o',
    instructions: 'You are a visual design and UX analyst. Analyse the screenshots and return structured findings.',
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_image', image_url: data.screenshots.desktop, detail: 'high' },
          { type: 'input_image', image_url: data.screenshots.mobile, detail: 'high' },
          { type: 'input_text', text: buildPrompt(data) },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'visual_analysis',
        strict: true,
        schema: zodToJsonSchema(AnalysisResultSchema) as Record<string, unknown>,
      },
    },
    store: false,
  })

  return JSON.parse(response.output_text)
}

export async function analyseVisual(
  data: CollectedData,
): Promise<AnalysisResult> {
  try {
    return await callGeminiAlpha(data)
  } catch {
    try {
      return await callGeminiAlpha(data)
    } catch {
      return await callOpenAiFallback(data)
    }
  }
}
