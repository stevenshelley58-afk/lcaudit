# Project Rules — lcaudit

## Development Workflow

- **NEVER run `npm run dev`, `npm run build`, or `next dev` locally.** The dev machine is ARM and local builds break constantly.
- **Always push to GitHub and deploy via Vercel CLI or Vercel dashboard.**
- **Nothing is "done" until it's deployed and verified on a Vercel preview URL.** Not locally, not "it should work" — actually deployed and checked.
- Workflow: code → push to GitHub → Vercel auto-deploys preview → verify on preview URL → report back.
- Use `vercel logs` or the Vercel dashboard to debug build/runtime errors. Never debug locally.

## Non-Negotiable

1. **Every finding must cite evidence.** No evidence = discarded in synthesis.
2. **All collected data must flow through to analysers.** No dead data.
3. **ELI5 first, detail second.** Summary layer = zero tech knowledge.
4. **Mobile-first.** Every screen works on a phone.
5. **120s timeouts minimum.** Optimise later.
6. **Hard failures only.** Every error throws with a clear reason. No silent swallowing.
7. **Debug everything.** Every prompt, response, image, model choice — visible in debug panel.
8. **History everything.** Every audit run stored and replayable.
9. **Australian English** in all copy.
10. **Use native structured output, don't double-validate.** Gemini's responseJsonSchema and OpenAI's strict JSON schema mode guarantee schema compliance.

## Coding Style

- TypeScript strict mode, no `any`
- Immutability always — spread operator, never mutate objects or arrays
- Functional components, no class components
- Named exports (not default) for everything except page/layout
- Collocate types with usage — shared types in `lib/types.ts`
- Many small files > few large files (200-400 lines typical, 800 max)
- Functions < 50 lines, no deep nesting (> 4 levels)
- Error messages must be human-readable and actionable
- No console.log in production — use structured logging to debug traces
- Proper error handling with try/catch at every level
- Use Zod for all input validation

## Git Workflow

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`
- Push frequently — Vercel preview is our test environment
- Atomic commits — one logical change per commit

## Agent Orchestration

Use agents proactively:
- Complex features → **planner** agent first
- After writing code → **code-reviewer** agent
- Build/deploy fails → **build-error-resolver** agent
- Security-sensitive code → **security-reviewer** agent
- Architectural decisions → **architect** agent

Use parallel agents for independent tasks where possible.

## Security

- No hardcoded secrets (API keys, passwords, tokens)
- All secrets in environment variables, validated at startup
- All user inputs validated (URL input especially — prevent SSRF)
- Rate limiting on audit endpoint
- Error messages don't leak internal details
- No PII in logs
