import { zodToJsonSchema } from 'zod-to-json-schema'
import { ThinkingLevel, MediaResolution } from '@google/genai'
import { getGeminiAlphaClient, getOpenAiClient } from '@/lib/ai'
import { AnalysisResultSchema } from '@/lib/types'
import type { CollectedData, AnalysisResult } from '@/lib/types'

function buildPrompt(data: CollectedData, hostname: string): string {
  const { html } = data
  const imgCount = html.images.length
  const h1Count = html.headings.h1.length
  const h2Count = html.headings.h2.length
  const pageTitle = html.title ?? 'unknown'
  const h1Text = html.headings.h1[0] ?? 'none'

  return `You are a visual design and UX analyst. Analyse the two screenshots (desktop and mobile) of this website.

SITE: ${hostname}
Page title: "${pageTitle}"
H1: "${h1Text}"

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
- evidence field must quote what you see verbatim. Bad: "some text has low contrast". Good: "White text 'Get Started' on pale blue background in hero section"
- evidenceType must be "SCREENSHOT" for visual findings
- evidenceDetail must describe where in the screenshot you see the issue (e.g. "mobile - hero section", "desktop - navigation bar")
- section must be "Visual & Design" for all findings
- fix must reference the specific element. Bad: "improve contrast". Good: "Add a dark overlay behind the '${h1Text}' hero text"
- Rating: Good (polished, professional), Needs Work (functional but rough), Critical (major usability issues)
- Score: 0-100 based on overall visual quality
- Be specific - don't say "some issues", say exactly what you see
- Use English spelling (analyse, colour, organisation). No slang, no colloquialisms, no em dashes.
- eli5Summary must NOT start with "The website" or "The site". Must reference something only true of ${hostname} (e.g. a colour, a layout element, or a specific piece of text you can see). Bad: "Clean layout with room for improvement". Good: "Bold dark hero with the '${h1Text}' headline grabs attention, but the pale grey body text is hard to read on mobile".`
}

async function callGeminiAlpha(data: CollectedData, hostname: string): Promise<AnalysisResult> {
  const client = getGeminiAlphaClient()

  const desktopBase64 = data.screenshots.desktopBuffer.toString('base64')
  const mobileBase64 = data.screenshots.mobileBuffer.toString('base64')

  const response = await client.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{
      parts: [
        { inlineData: { mimeType: 'image/png', data: desktopBase64 } },
        { inlineData: { mimeType: 'image/png', data: mobileBase64 } },
        { text: buildPrompt(data, hostname) },
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

async function callOpenAiFallback(data: CollectedData, hostname: string): Promise<AnalysisResult> {
  const client = getOpenAiClient()

  const desktopDataUri = `data:image/png;base64,${data.screenshots.desktopBuffer.toString('base64')}`
  const mobileDataUri = `data:image/png;base64,${data.screenshots.mobileBuffer.toString('base64')}`

  const response = await client.responses.create({
    model: 'gpt-4o',
    instructions: 'You are a visual design and UX analyst. Analyse the screenshots and return structured findings.',
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_image', image_url: desktopDataUri, detail: 'high' },
          { type: 'input_image', image_url: mobileDataUri, detail: 'high' },
          { type: 'input_text', text: buildPrompt(data, hostname) },
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
  hostname: string,
): Promise<AnalysisResult> {
  try {
    return await callGeminiAlpha(data, hostname)
  } catch {
    try {
      return await callGeminiAlpha(data, hostname)
    } catch {
      return await callOpenAiFallback(data, hostname)
    }
  }
}
