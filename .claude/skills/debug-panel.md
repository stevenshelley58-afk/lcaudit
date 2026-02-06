# Debug & Tracing Module — lcaudit

## Design Principle: Fully Independent

The `debug/` folder is a **self-contained module**. It has:
- Its own types (`debug/types.ts`)
- Its own storage adapter (`debug/store.ts`)
- Its own UI route and components (`debug/viewer/`)
- Its own public API (`debug/index.ts`)

**Zero coupling to the rest of the app.** The app calls `debug.logX()` functions.
If you delete the entire `debug/` folder:
1. Remove the imports from `api/audit/route.ts` and collectors/analysers
2. Remove the `/debug` route
3. Everything else works. No broken builds.

## Why Independent

This module will eventually be replaced by a centralised monitor app
(currently `see-it-monitor`, being renamed to a universal operations dashboard).
When that happens, we rip out `debug/` and plug lcaudit's traces into the
external monitor via API. The app itself doesn't change.

## Public API (`debug/index.ts`)

```typescript
// The only import the rest of the app needs
import { trace } from '@/debug'

// Start a trace for an audit run
const t = trace.start(auditId, url)

// Log collector results
t.collector('screenshots', { status: 'ok', durationMs: 2340, tier: 'required' })
t.collector('lighthouse', { status: 'ok', durationMs: 4100, tier: 'required' })
t.collector('robots', { status: 'fail', error: '404', durationMs: 120, tier: 'optional' })

// Log AI calls
t.aiCall({
  step: 'visual-design',
  provider: 'google',
  model: 'gemini-3-pro-preview',
  promptTokens: 1200,
  completionTokens: 890,
  durationMs: 3400,
  cost: 0.0032,
  isFallback: false,
  prompt: fullPromptText,       // stored for replay
  response: fullResponseText,   // stored for replay
})

// Log synthesis
t.aiCall({
  step: 'synthesis',
  provider: 'openai',
  model: 'gpt-5',
  promptTokens: 8400,
  completionTokens: 2100,
  durationMs: 6200,
  cost: 0.018,
  isFallback: false,
  prompt: synthesisPrompt,
  response: synthesisResponse,
})

// Finalise
t.complete({ overallScore: 72, totalDurationMs: 14200 })

// Store (Vercel Blob for full trace, KV for index)
await t.save()
```

## Trace Data Shape (`debug/types.ts`)

```typescript
interface AuditTrace {
  auditId: string
  url: string
  hostname: string
  startedAt: string              // ISO
  completedAt: string | null
  totalDurationMs: number | null
  overallScore: number | null
  status: 'running' | 'complete' | 'failed'

  collectors: CollectorLog[]
  aiCalls: AiCallLog[]
  warnings: string[]             // e.g. "Audit exceeded 60s SLO"
  errors: string[]               // e.g. "Required collector failed"

  totalCost: number              // sum of all aiCall costs
  totalTokens: {
    prompt: number
    completion: number
  }
}

interface CollectorLog {
  name: string
  tier: 'required' | 'optional'
  status: 'ok' | 'fail' | 'timeout'
  durationMs: number
  error: string | null
  dataSize: number | null        // bytes of returned data
  startedAt: string
}

interface AiCallLog {
  step: string                   // e.g. 'visual-design', 'synthesis'
  provider: 'google' | 'openai' | 'anthropic'
  model: string
  promptTokens: number
  completionTokens: number
  durationMs: number
  cost: number
  isFallback: boolean
  fallbackReason: string | null  // e.g. 'rate_limit', 'timeout', 'error'
  startedAt: string

  // Full prompt/response stored in Blob, not KV (too large)
  prompt: string
  response: string
}
```

## Storage Layer (`debug/store.ts`)

**Vercel KV** — trace index (lightweight, fast lookups):
- Key: `trace:{auditId}` → `{ auditId, url, status, score, duration, cost, createdAt }`
- Key: `trace:latest` → sorted set of last 100 audit IDs
- Key: `config:models` → model assignments per analyser
- Key: `config:prompts` → prompt template overrides
- Key: `config:timeouts` → collector/AI timeouts

**Vercel Blob** — full traces (large, archived):
- Path: `traces/{auditId}.json` → full `AuditTrace` object
- Path: `audits/{auditId}/report.json` → full `AuditReport`
- Path: `audits/{auditId}/desktop.png` → screenshot
- Path: `audits/{auditId}/mobile.png` → screenshot

## Debug Panel UI (`debug/viewer/`)

Accessed via `/debug` route. Protected by `DEBUG_PASSWORD_HASH` env var.

### Views:

**Trace List** — last 100 audits. Columns: URL, score, duration, cost, status, date.
Click any row to open trace detail.

**Trace Detail** — single audit run:
- Timeline: horizontal waterfall showing collectors then AI calls with durations
- Collector cards: name, status badge, duration, tier
- AI call cards: step, model, provider, tokens, cost, duration, fallback badge
- Expandable: full prompt text, full response text (for replay/debugging)
- Cost breakdown: pie chart by provider, table by step
- Warnings/errors list

**Config Panel** (read-write):
- Model assignments per analyser step (dropdown)
- Prompt template overrides per analyser (textarea)
- Collector timeouts, AI timeouts
- Save → writes to Vercel KV → takes effect next audit

### UI Rules:
- Same design system as main app (see design-system.md)
- Self-contained components in `debug/viewer/components/`
- Does NOT import from `components/` — fully independent

## Vercel Function Config

```json
// vercel.json
{
  "functions": {
    "app/api/audit/route.ts": {
      "maxDuration": 120
    }
  }
}
```

**SLO:** Target audit completion under 60 seconds. `maxDuration: 120` gives buffer.
- If audit exceeds 60s → completes but trace logs warning
- If audit exceeds 120s → Vercel kills the function, trace logs error

## Future: Plugging Into Universal Monitor

When the universal monitor is ready:
1. Replace `debug/store.ts` with an HTTP client that POSTs traces to monitor API
2. Delete `debug/viewer/` (monitor has its own UI)
3. Keep `debug/index.ts` and `debug/types.ts` (the public API doesn't change)
4. The app code that calls `t.collector()` and `t.aiCall()` doesn't change at all
