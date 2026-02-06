# Backend Patterns — lcaudit

## API Design

All API routes in Next.js App Router format:
```typescript
// app/api/audit/route.ts
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = AuditRequestSchema.parse(body)
    const result = await runAudit(validated.url)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return errorHandler(error, request)
  }
}
```

## Error Handling

### Centralised Error Handler
```typescript
class ApiError extends Error {
  constructor(public statusCode: number, public message: string) {
    super(message)
  }
}

function errorHandler(error: unknown, req: Request): Response {
  if (error instanceof ApiError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: error.errors }, { status: 400 })
  }
  console.error('Unexpected error:', error)
  return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
}
```

### Retry with Backoff (for external API calls)
```typescript
async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn() }
    catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000))
    }
  }
  throw lastError!
}
```

## Rate Limiting

Simple in-memory rate limiter for the audit endpoint:
```typescript
const limiter = new Map<string, number[]>()

function checkRateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const requests = (limiter.get(ip) || []).filter(t => now - t < windowMs)
  if (requests.length >= max) return false
  requests.push(now)
  limiter.set(ip, requests)
  return true
}
```

## Structured Logging via Debug Module

All tracing goes through the independent `debug/` module. The app never writes traces directly — it calls the debug API:

```typescript
import { trace } from '@/debug'

// In api/audit/route.ts
const t = trace.start(auditId, url)

// In collector runner
t.collector('screenshots', { status: 'ok', durationMs: 2340, tier: 'required' })

// In analyser runner
t.aiCall({ step: 'visual-design', provider: 'google', model: 'gemini-3-pro-preview', ... })

// After pipeline
t.complete({ overallScore: 72, totalDurationMs: 14200 })
await t.save()
```

See `debug-panel.md` for full trace API, storage, and UI specs.

The debug module is fully deletable — if you remove the `debug/` folder, just remove the import and `t.*` calls. Nothing else breaks.
