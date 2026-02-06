# CLAUDE.md — lcaudit

## What This Is

Labcast's automated website audit engine. Input a URL, get a comprehensive, evidence-backed report in under 60 seconds. Every finding cites real data. No generic SEO checklists. No AI slop.

Two audiences:
- **The client** (zero tech knowledge): clean, simple summary of what's wrong and why it matters
- **The technical reader** (developer): expandable sections with every individual issue, raw evidence, and the fix

## Project Status

**Clean build.** Fresh project in `C:\Dev\lcaudit`. No legacy code, no migration.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- API Routes (serverless on Vercel)
- Multi-provider AI: Gemini (visual + bulk), OpenAI (synthesis + cheap tasks), Claude (fallback)
- ScreenshotOne API (screenshots), PageSpeed Insights API (performance)
- Vercel KV (config/settings), Vercel Blob (audit reports, screenshots) — NO local filesystem in production
- Lucide React (icons), Recharts (charts)

## Pipeline

```
URL → WAVE 1 (10 parallel collectors) → WAVE 2 (8 parallel AI analysers) → WAVE 3 (synthesis) → REPORT
```

See `.claude/skills/collectors.md` for collector specs.
See `.claude/skills/analysers.md` for analyser specs + model routing.
See `.claude/skills/api-providers.md` for SDK usage and API best practices.

## File Structure

```
lcaudit/
├── app/
│   ├── layout.tsx, page.tsx, globals.css
│   └── api/
│       ├── audit/route.ts         # POST — main pipeline
│       ├── history/route.ts       # GET audit history (reads from Vercel Blob)
│       └── config/route.ts        # GET/PUT debug config (reads/writes Vercel KV)
├── lib/
│   ├── types.ts                   # All TypeScript interfaces (Zod schemas)
│   ├── constants.ts               # Timeouts, API URLs
│   ├── errors.ts                  # Error types
│   └── pricing.ts                 # LLM cost calculation
├── collectors/                    # 10 data collectors (see skills/collectors.md)
│   ├── index.ts                   # collectAll — Promise.all orchestrator
│   └── [screenshots|lighthouse|html-extract|robots|sitemap|ssl-dns|security-headers|serp|link-check|tech-stack].ts
├── analysers/                     # 8 AI analysers (see skills/analysers.md)
│   ├── index.ts                   # runAllAnalysers — Promise.all orchestrator
│   └── [visual|performance|seo|accessibility|security|social|tech-stack|content].ts
├── synthesis/
│   └── synthesize.ts              # Final LLM call — compile report
├── components/                    # See skills/design-system.md
│   ├── Header, Footer, IdleView, LoadingView, ErrorView
│   ├── ResultsDashboard, AuditChart, TerminalLog
│   └── SectionCard, FindingRow, DebugOverlay
├── hooks/
│   ├── useAuditExecution.ts, useAuditConfig.ts, useDebugMode.ts
├── debug/                         # Self-contained debug/tracing module (deletable)
│   ├── index.ts                   # Public API: createTrace, logCollector, logAiCall, etc.
│   ├── types.ts                   # AuditTrace, TraceEntry, AiCallLog interfaces
│   ├── store.ts                   # Storage adapter (Vercel KV + Blob)
│   ├── viewer/                    # Debug panel UI (self-contained route)
│   │   ├── page.tsx               # /debug route
│   │   └── components/            # Timeline, AiCallCard, CollectorCard, CostBreakdown
│   └── README.md                  # How to wire up, how to delete without breaking anything
└── .claude/
    ├── agents/                    # Subagents for delegation
    │   ├── planner.md             # /plan — implementation planning (waits for confirm)
    │   ├── architect.md           # System design decisions
    │   ├── code-reviewer.md       # /code-review — quality + security review
    │   ├── build-error-resolver.md # /build-fix — fix Vercel deploy errors
    │   └── security-reviewer.md   # Security vulnerability detection
    ├── commands/                   # Slash commands
    │   ├── plan.md                # /plan — create implementation plan
    │   ├── build-fix.md           # /build-fix — fix build errors on Vercel
    │   └── code-review.md         # /code-review — review uncommitted changes
    ├── contexts/                   # Dynamic context injection
    │   └── dev.md                 # Development mode (write code first, explain after)
    ├── rules/                     # Always-loaded rules
    │   ├── project-rules.md       # Non-negotiable rules + workflow + security
    │   └── typescript-rules.md    # TypeScript/immutability/patterns
    └── skills/                    # Loaded on demand
        ├── api-providers.md       # Gemini/OpenAI/Claude SDK best practices
        ├── analysers.md           # 8 analyser specs + model routing + data schema
        ├── collectors.md          # 10 collector specs
        ├── design-system.md       # Colours, typography, components, layout
        ├── debug-panel.md         # Debug module specs (tracing, storage, viewer, independence)
        ├── frontend-patterns.md   # React/hooks/state/performance patterns
        └── backend-patterns.md    # API routes/error handling/rate limiting/logging
```

## Build Order

### Phase 1: Foundation
1. Init Next.js + TypeScript + Tailwind
2. Set up Vercel project
3. Define all TypeScript types (`lib/types.ts`)
4. Build storage layer (JSON read/write helpers)
5. Build collector framework (parallel runner with timeouts + hard failures)
6. Implement all 10 collectors

### Phase 2: Intelligence
7. Build analyser framework (parallel AI calls with structured output)
8. Write all 8 analyser prompts
9. Build synthesis prompt
10. Wire collectors → analysers → synthesis pipeline
11. POST /api/audit endpoint

### Phase 3: Presentation
12. Port UI components (Header, Footer, IdleView, LoadingView, ErrorView)
13. Build ResultsDashboard with section cards
14. Build AuditChart, TerminalLog, SectionCard, FindingRow
15. Mobile responsive pass

### Phase 4: Operations
16. Build debug module (`debug/index.ts`, `debug/types.ts`, `debug/store.ts`)
17. Wire trace calls into collectors + analysers + synthesis
18. Build debug viewer UI (`debug/viewer/`)
19. Build audit history (Vercel Blob storage + list UI)
20. Deploy and test on real sites

## Environment Variables

```
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
SCREENSHOTONE_API_KEY=
PAGESPEED_API_KEY=
GOOGLE_CSE_API_KEY=
GOOGLE_CSE_ID=
DEBUG_PASSWORD_HASH=
KV_REST_API_URL=              # Vercel KV
KV_REST_API_TOKEN=            # Vercel KV
BLOB_READ_WRITE_TOKEN=        # Vercel Blob
```

## Key Dependencies

```
next, react, react-dom               # Framework
typescript, @types/react, @types/node # TypeScript
tailwindcss, @tailwindcss/postcss     # Styling
@google/genai                         # Gemini SDK
openai                                # OpenAI SDK
@anthropic-ai/sdk                     # Claude SDK (fallback)
zod, zod-to-json-schema               # Schema definition + conversion
recharts, lucide-react                # Charts + icons
@vercel/kv                            # Config/settings persistence
@vercel/blob                          # Audit reports + screenshot storage
```
