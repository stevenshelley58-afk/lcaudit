---
name: api-providers
description: SDK usage rules for Gemini, OpenAI, and Claude APIs. Use when writing any AI call, structured output, or model configuration.
---

# API Providers — lcaudit

Rules from official docs. Follow exactly.

## Google Gemini (Visual & Design, Performance, Accessibility, Content)

**SDK:** `@google/genai`. Use `generateContent` method.

**Structured Output:** `responseMimeType: "application/json"` + `responseJsonSchema` with Zod schema converted via `zodToJsonSchema()`. Guarantees valid JSON. Do NOT use prompt-based "return JSON" — use the native feature.

**Image Input:** Send as `inlineData` with `mimeType: "image/png"` and base64 data. Place text prompt AFTER image parts in contents array.

**media_resolution (v1alpha feature):**
- Visual & Design analyser MUST use v1alpha client because of `media_resolution_high`
- `media_resolution_high` = 1120 tokens/image — budget this into cost estimates
- Other analysers without images: not applicable
- Explicitly configure v1alpha for Visual analyser, other analysers can use stable

**thinking_level (massive cost/latency lever):**
- Visual & Design: `"high"` — complex subjective analysis
- Performance, Accessibility, Content: `"low"` — structured data extraction, fast and cheap
- Default is `"high"` if unspecified. Always set explicitly.

**Temperature:** Leave at default 1.0. Gemini docs state default is 1.0 and lowering below 1.0 can cause looping. This is a documented constraint, not preference.

**Prompt structure:** Gemini 3 is direct/concise by default. Don't over-engineer. Constraints at the top, data context before instructions.

## OpenAI — Responses API (all models)

**SDK:** `openai`. Use `client.responses.create()` for ALL OpenAI calls.

**Why Responses API over Chat Completions:**
- 3% better performance with reasoning models (OpenAI internal evals)
- 40-80% better cache utilisation = lower costs
- `instructions` param cleaner than system messages
- `output_text` helper reduces parsing boilerplate
- Future-proof: all new features land here first

**Structured Output (Responses API shape):**
```typescript
const response = await client.responses.create({
  model: "gpt-4o-mini",
  instructions: "You are an SEO analyser...",
  input: [{ role: "user", content: JSON.stringify(data) }],
  text: {
    format: {
      type: "json_schema",
      name: "seo_analysis",
      strict: true,
      schema: zodToJsonSchema(SeoAnalysisSchema)
    }
  },
  store: false
})
const result = JSON.parse(response.output_text)
```

**gpt-4o-mini** (SEO, Security, Social, Tech Stack):
- $0.15/$0.60 per 1M tokens
- Structured output via `text.format`
- Temperature 0.3-0.5 for analysis
- No vision needed

**gpt-5** (Synthesis):
```typescript
const response = await client.responses.create({
  model: "gpt-5",
  instructions: "You are a web audit synthesis writer...",
  input: [{ role: "user", content: JSON.stringify(allAnalyses) }],
  reasoning: { effort: "medium" },
  text: {
    format: {
      type: "json_schema",
      name: "audit_report",
      strict: true,
      schema: zodToJsonSchema(AuditReportSchema)
    }
  },
  store: false,
  max_output_tokens: 4096
})
```
**CRITICAL: When `reasoning.effort` is not `none`, you CANNOT set `temperature` or `top_p`. It will error. Control output via `max_output_tokens` instead.**

## Anthropic Claude (Fallback only)

**SDK:** `@anthropic-ai/sdk`.

**Structured Output:** No native JSON schema enforcement. Use strong system prompt with explicit JSON instructions + Zod parse + try/catch. Fine for fallback — rarely fires.

**When it fires:** Only if both primary and first fallback fail. Log prominently in debug panel.

## Universal Rules (all providers)

1. **Always use native structured output** where available. Never rely on "please return JSON" alone.
2. **Share a single Zod schema** across all providers. Define in `lib/types.ts`, convert per provider.
3. **No unnecessary restrictions.** Don't set max_tokens without reason. Don't set temperature to 0.
4. **Every prompt must include:** data to analyse, what to look for, rating criteria, reminder that every finding needs evidence.
5. **Don't repeat schema in prompt** if using native structured output — schema IS the instruction.
6. **System prompts are short and sharp.** Role + task + constraints. No essays.
7. **Log everything.** Model, provider, prompt, response, tokens, duration, cost — all to debug trace.
