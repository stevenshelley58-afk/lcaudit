# Collectors — lcaudit

All collectors run via `Promise.allSettled` with individual timeouts. Each collector returns typed data or throws with clear error message.

## Required vs Optional

**Required** (audit fails if these fail — no point continuing without core data):
- Screenshots (ScreenshotOne)
- Lighthouse (PageSpeed Insights)
- HTML & DOM extraction

**Optional** (audit continues without, section marked "Data unavailable"):
- robots.txt, sitemap.xml, SSL & DNS, Security Headers, SERP, Internal Link Check, Tech Stack Detection

If ALL required collectors fail, abort the audit and return an error to the user.
If SOME optional collectors fail, continue — analysers handle missing data gracefully.

## Collector Specs

| # | Collector | Output | Tier |
|---|-----------|--------|------|
| 1 | Screenshots (ScreenshotOne API) | Desktop 1440x900 + Mobile 390x844 — downloaded to Vercel Blob as PNG, returns Blob URLs | Required |
| 2 | Lighthouse (PageSpeed Insights API) | Mobile + Desktop scores, LCP, CLS, TBT, diagnostics | Required |
| 3 | HTML & DOM extraction | Title, meta, headings, images, links, schema, OG tags, forms, word count | Required |
| 4 | robots.txt | Exists, content, sitemap refs, disallow rules | Optional |
| 5 | sitemap.xml | Exists, URL count, sample URLs, lastmod | Optional |
| 6 | SSL & DNS | HTTPS, cert issuer/expiry, protocol, redirect chain | Optional |
| 7 | Security Headers | HSTS, CSP, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy | Optional |
| 8 | SERP Lookup (Google Custom Search API) | Indexed pages estimate via `site:` query, homepage snippet, brand search presence | Optional |
| 9 | Internal Link Check | HEAD request first 50 internal links, find 404s and redirects | Optional |
| 10 | Tech Stack Detection | Platform, theme, detected apps/scripts, third-party count | Optional |

## Screenshot Storage

ScreenshotOne returns temporary URLs that expire. To satisfy the "history everything" rule:
1. Fetch screenshot PNG from ScreenshotOne URL
2. Upload to Vercel Blob with path: `audits/{auditId}/desktop.png` and `audits/{auditId}/mobile.png`
3. Store the permanent Blob URL in the audit report
4. All references to screenshots use Blob URLs, never ScreenshotOne URLs

## SERP Lookup Provider

Uses **Google Custom Search API** (Programmable Search Engine):
- `site:{domain}` query to estimate indexed pages
- Brand name query to check search presence
- Free tier: 100 queries/day. Paid: $5 per 1000 queries.
- Env var: `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_ID`
- If unavailable or over quota, SERP collector returns null (optional collector).

## SPA Limitation

Collectors fetch initial HTML, NOT post-hydration DOM. SPA-heavy sites (React/Angular/Vue client-rendered) will have limited HTML data. This is a known v1 limitation. Future: add a "rendered HTML" collector using a headless browser service.

## Collector Framework

- `collectors/index.ts` exports `collectAll(url: string): Promise<CollectedData>`
- Uses `Promise.allSettled` — evaluates results after all complete
- Required collectors: if any `rejected`, throw `AuditError` with details
- Optional collectors: if `rejected`, set that field to `null` in `CollectedData`
- Each collector returns typed data or throws with clear error
- `CollectedData` interface contains all 10 outputs, each nullable (optional collectors can fail)
- Timeout wrapper: generic `withTimeout(promise, ms, label)` helper in `lib/utils.ts`
- Default timeout: 120s per collector (configurable via debug panel)
