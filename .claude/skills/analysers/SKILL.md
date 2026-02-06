---
name: analysers
description: AI analyser specs for lcaudit — model routing, data flow, output shape, evidence rules. Use when building or modifying any analyser, synthesis, or the analysis pipeline.
---

# Analysers — lcaudit

8 independent AI calls via `Promise.allSettled`. Each receives ONLY relevant data. Every finding must cite evidence. Models split across providers to avoid rate limits and optimise cost.

## Failure Policy

**Collectors:** Use `Promise.allSettled`. Collectors are tiered:
- **Required** (audit fails without these): Screenshots, Lighthouse, HTML & DOM
- **Optional** (audit continues, section marked "Data unavailable"): robots.txt, sitemap, SSL, security headers, SERP, link check, tech stack

**Analysers:** Use `Promise.allSettled`. All analysers attempt. If an analyser fails after retries + fallback:
- Section included in report with `rating: "Error"` and clear message: "Analysis unavailable — [reason]"
- Synthesis MUST NOT fabricate findings for missing sections
- Synthesis notes which sections were unavailable

**Synthesis:** If synthesis fails, return partial report (section cards only, no executive summary, no top fixes, no overall score). Display clear "Synthesis unavailable" message.

## Model Routing (configurable via debug panel)

| # | Analyser | Provider | Model | Why |
|---|----------|----------|-------|-----|
| 1 | Visual & Design | Google | gemini-3-pro-preview | Best multimodal — sees screenshots |
| 2 | Performance & Speed | Google | gemini-3-flash-preview | Structured data, cheap and fast |
| 3 | SEO & Keywords | OpenAI | gpt-4o-mini | Text-heavy, no reasoning needed |
| 4 | Accessibility | Google | gemini-3-flash-preview | Structured Lighthouse data, cheap |
| 5 | Security & Trust | OpenAI | gpt-4o-mini | Header checking, simple rules |
| 6 | Social & Sharing | OpenAI | gpt-4o-mini | Trivial analysis, cheapest |
| 7 | Tech Stack & Apps | OpenAI | gpt-4o-mini | Pattern matching, minimal reasoning |
| 8 | Content & Conversion | Google | gemini-3-flash-preview | Needs nuance but not Pro-level |

**Synthesis:** OpenAI `gpt-5` via Responses API — best at long-form writing. `reasoning.effort: "medium"`, NO temperature (incompatible with reasoning). See `api-providers.md`.

**Fallback chain:** Retry once same provider, then:
- Google → OpenAI gpt-4o (multimodal capable)
- OpenAI → Google gemini-3-flash-preview
- Synthesis → Claude claude-sonnet-4-5-20250929

**Cost per audit target:** ~$0.02-0.05.

## Data Flow (what each analyser receives)

| # | Analyser | Data In |
|---|----------|---------|
| 1 | Visual & Design | Screenshots (base64 PNG from Blob) + DOM data |
| 2 | Performance & Speed | Lighthouse data + page size + script count |
| 3 | SEO & Keywords | Meta, headings, body text, schema, sitemap, SERP data, alt tags |
| 4 | Accessibility | Lighthouse a11y + DOM (images, forms, headings, tap targets) |
| 5 | Security & Trust | SSL, security headers, mixed content |
| 6 | Social & Sharing | OG tags, Twitter card, favicon |
| 7 | Tech Stack & Apps | Platform, detected apps, missing app recommendations |
| 8 | Content & Conversion | Word count, headings, forms, CTAs, broken links |

## Output Shape (every analyser returns this)

```typescript
interface AnalysisResult {
  sectionTitle: string
  eli5Summary: string           // 2-3 sentences, zero jargon
  whyItMatters: string          // business impact
  overallRating: 'Good' | 'Needs Work' | 'Critical' | 'Error'
  findings: Finding[]
}
```

All model assignments stored in config (Vercel KV), editable via debug panel. Every AI call logs: model, provider, prompt, response, tokens, duration, cost.

## Synthesis (Wave 3)

Single AI call via OpenAI Responses API. Receives all 8 analyses. Scores overall health (0-100). Picks top 5 fixes. Writes executive summary. Discards any finding without evidence. Notes any sections that returned "Error".

## Report Data Schema

```typescript
interface AuditReport {
  url: string
  hostname: string
  generatedAt: string
  auditDurationMs: number
  overallScore: number               // 0-100
  executiveSummary: string           // 3-5 sentences, zero jargon
  sections: AuditSection[]
  topFixes: TopFix[]                 // top 5
  platform: string | null
  detectedApps: DetectedApp[]
  missingApps: RecommendedApp[]
  screenshots: { desktop: string; mobile: string }  // Vercel Blob URLs
  socialPreview: { ogImage: string | null; ogTitle: string | null; ogDescription: string | null }
  lighthouse: { mobile: LighthouseScores; desktop: LighthouseScores }
  unavailableSections: string[]      // IDs of sections that failed
}

interface AuditSection {
  id: string
  title: string
  iconKey: string                    // Lucide icon key e.g. "shield", "search", "eye"
  eli5Summary: string
  whyItMatters: string
  rating: 'Good' | 'Needs Work' | 'Critical' | 'Error'
  score: number | null
  findings: Finding[]
}

interface Finding {
  id: string
  title: string
  description: string
  evidence: string                   // specific data citation
  evidenceType: 'HTML' | 'SCREENSHOT' | 'METRIC' | 'HEADER' | 'MISSING'
  evidenceDetail: string | null      // e.g. CSS selector, header name, metric value
  impact: 'High' | 'Medium' | 'Low'
  fix: string
  category: string
  section: string
}

interface TopFix {
  title: string
  section: string
  impact: string
  description: string
}
```

## Evidence Rules

Each `evidenceType` has strict requirements:
- **HTML**: `evidence` = the actual HTML snippet or text. `evidenceDetail` = CSS selector path.
- **SCREENSHOT**: `evidence` = description of what's visible. `evidenceDetail` = "desktop" or "mobile" + region description.
- **METRIC**: `evidence` = the metric value and benchmark. `evidenceDetail` = metric name (e.g. "LCP", "CLS").
- **HEADER**: `evidence` = the header value (or "missing"). `evidenceDetail` = header name.
- **MISSING**: `evidence` = what should exist but doesn't. `evidenceDetail` = where it was expected.

Any finding without valid evidence is discarded by synthesis.
