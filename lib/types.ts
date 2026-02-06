import { z } from 'zod'

// ============================================================
// Input Validation
// ============================================================

export const PageLabelSchema = z.enum(['homepage', 'product-page'])

export type PageLabel = z.infer<typeof PageLabelSchema>

export const AuditPageSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  label: PageLabelSchema,
})

export type AuditPage = z.infer<typeof AuditPageSchema>

export const AuditRequestSchema = z.object({
  pages: z.array(AuditPageSchema).min(1).max(2),
})

export type AuditRequest = z.infer<typeof AuditRequestSchema>

// ============================================================
// Collector Output Types
// ============================================================

export const ScreenshotDataSchema = z.object({
  desktop: z.string().url(),
  mobile: z.string().url(),
})

export type ScreenshotData = z.infer<typeof ScreenshotDataSchema>

export const LighthouseScoresSchema = z.object({
  performance: z.number(),
  accessibility: z.number(),
  bestPractices: z.number(),
  seo: z.number(),
  lcp: z.number(),
  cls: z.number(),
  tbt: z.number(),
  fcp: z.number(),
  si: z.number(),
  tti: z.number(),
})

export type LighthouseScores = z.infer<typeof LighthouseScoresSchema>

export const LighthouseDiagnosticSchema = z.object({
  title: z.string(),
  description: z.string(),
  score: z.number().nullable(),
})

export type LighthouseDiagnostic = z.infer<typeof LighthouseDiagnosticSchema>

export const LighthouseDataSchema = z.object({
  mobile: LighthouseScoresSchema,
  desktop: LighthouseScoresSchema,
  diagnostics: z.array(LighthouseDiagnosticSchema),
})

export type LighthouseData = z.infer<typeof LighthouseDataSchema>

export const ImageDataSchema = z.object({
  src: z.string(),
  alt: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
})

export type ImageData = z.infer<typeof ImageDataSchema>

export const HtmlDataSchema = z.object({
  title: z.string().nullable(),
  metaDescription: z.string().nullable(),
  canonicalUrl: z.string().nullable(),
  headings: z.object({
    h1: z.array(z.string()),
    h2: z.array(z.string()),
    h3: z.array(z.string()),
  }),
  images: z.array(ImageDataSchema),
  links: z.object({
    internal: z.array(z.string()),
    external: z.array(z.string()),
  }),
  ogTags: z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    image: z.string().nullable(),
    type: z.string().nullable(),
    url: z.string().nullable(),
  }),
  twitterCard: z.object({
    card: z.string().nullable(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    image: z.string().nullable(),
  }),
  schemaOrg: z.array(z.unknown()),
  forms: z.number(),
  wordCount: z.number(),
  language: z.string().nullable(),
  favicon: z.string().nullable(),
  viewport: z.string().nullable(),
})

export type HtmlData = z.infer<typeof HtmlDataSchema>

export const RobotsDataSchema = z.object({
  exists: z.boolean(),
  content: z.string().nullable(),
  disallowRules: z.array(z.string()),
  sitemapRefs: z.array(z.string()),
})

export type RobotsData = z.infer<typeof RobotsDataSchema>

export const SitemapDataSchema = z.object({
  exists: z.boolean(),
  urlCount: z.number(),
  sampleUrls: z.array(z.string()),
  lastmod: z.string().nullable(),
})

export type SitemapData = z.infer<typeof SitemapDataSchema>

export const RedirectHopSchema = z.object({
  url: z.string(),
  statusCode: z.number(),
})

export type RedirectHop = z.infer<typeof RedirectHopSchema>

export const SslDnsDataSchema = z.object({
  isHttps: z.boolean(),
  certIssuer: z.string().nullable(),
  certExpiry: z.string().nullable(),
  protocol: z.string().nullable(),
  redirectChain: z.array(RedirectHopSchema),
})

export type SslDnsData = z.infer<typeof SslDnsDataSchema>

export const SecurityHeadersDataSchema = z.object({
  headers: z.record(z.string(), z.string().nullable()),
  missingHeaders: z.array(z.string()),
  grade: z.string().nullable(),
})

export type SecurityHeadersData = z.infer<typeof SecurityHeadersDataSchema>

export const SerpResultSchema = z.object({
  title: z.string(),
  link: z.string(),
  snippet: z.string(),
})

export type SerpResult = z.infer<typeof SerpResultSchema>

export const SerpDataSchema = z.object({
  indexedPages: z.number().nullable(),
  homepageSnippet: z.string().nullable(),
  brandSearchPresent: z.boolean(),
  topResults: z.array(SerpResultSchema),
})

export type SerpData = z.infer<typeof SerpDataSchema>

export const BrokenLinkSchema = z.object({
  url: z.string(),
  statusCode: z.number(),
  sourceUrl: z.string(),
})

export type BrokenLink = z.infer<typeof BrokenLinkSchema>

export const RedirectLinkSchema = z.object({
  url: z.string(),
  redirectsTo: z.string(),
  statusCode: z.number(),
})

export type RedirectLink = z.infer<typeof RedirectLinkSchema>

export const LinkCheckDataSchema = z.object({
  totalChecked: z.number(),
  broken: z.array(BrokenLinkSchema),
  redirects: z.array(RedirectLinkSchema),
})

export type LinkCheckData = z.infer<typeof LinkCheckDataSchema>

export const DetectedAppSchema = z.object({
  name: z.string(),
  category: z.string(),
  version: z.string().nullable(),
})

export type DetectedApp = z.infer<typeof DetectedAppSchema>

export const ThirdPartyScriptSchema = z.object({
  domain: z.string(),
  purpose: z.string().nullable(),
})

export type ThirdPartyScript = z.infer<typeof ThirdPartyScriptSchema>

export const TechStackDataSchema = z.object({
  platform: z.string().nullable(),
  theme: z.string().nullable(),
  detectedApps: z.array(DetectedAppSchema),
  thirdPartyScripts: z.array(ThirdPartyScriptSchema),
  thirdPartyCount: z.number(),
})

export type TechStackData = z.infer<typeof TechStackDataSchema>

// ============================================================
// Collected Data (all 10 collectors combined)
// ============================================================

export const CollectedDataSchema = z.object({
  screenshots: ScreenshotDataSchema,
  lighthouse: LighthouseDataSchema,
  html: HtmlDataSchema,
  robots: RobotsDataSchema.nullable(),
  sitemap: SitemapDataSchema.nullable(),
  sslDns: SslDnsDataSchema.nullable(),
  securityHeaders: SecurityHeadersDataSchema.nullable(),
  serp: SerpDataSchema.nullable(),
  linkCheck: LinkCheckDataSchema.nullable(),
  techStack: TechStackDataSchema.nullable(),
})

export type CollectedData = z.infer<typeof CollectedDataSchema>

// ============================================================
// Analysis Output Types
// ============================================================

export const EvidenceTypeSchema = z.enum([
  'HTML',
  'SCREENSHOT',
  'METRIC',
  'HEADER',
  'MISSING',
])

export type EvidenceType = z.infer<typeof EvidenceTypeSchema>

export const ImpactSchema = z.enum(['High', 'Medium', 'Low'])

export type Impact = z.infer<typeof ImpactSchema>

export const RatingSchema = z.enum(['Good', 'Needs Work', 'Critical', 'Error'])

export type Rating = z.infer<typeof RatingSchema>

export const FindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  evidence: z.string(),
  evidenceType: EvidenceTypeSchema,
  evidenceDetail: z.string().nullable(),
  impact: ImpactSchema,
  fix: z.string(),
  category: z.string(),
  section: z.string(),
})

export type Finding = z.infer<typeof FindingSchema>

export const AnalysisResultSchema = z.object({
  sectionTitle: z.string(),
  eli5Summary: z.string(),
  whyItMatters: z.string(),
  overallRating: RatingSchema,
  score: z.number().min(0).max(100),
  findings: z.array(FindingSchema),
})

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

// ============================================================
// Report Types
// ============================================================

export const TopFixSchema = z.object({
  title: z.string(),
  section: z.string(),
  impact: z.string(),
  description: z.string(),
})

export type TopFix = z.infer<typeof TopFixSchema>

export const SynthesisResultSchema = z.object({
  executiveSummary: z.string(),
  overallScore: z.number().min(0).max(100),
  topFixes: z.array(TopFixSchema),
})

export type SynthesisResult = z.infer<typeof SynthesisResultSchema>

export const RecommendedAppSchema = z.object({
  name: z.string(),
  category: z.string(),
  reason: z.string(),
})

export type RecommendedApp = z.infer<typeof RecommendedAppSchema>

export const AuditSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  iconKey: z.string(),
  eli5Summary: z.string(),
  whyItMatters: z.string(),
  rating: RatingSchema,
  score: z.number().nullable(),
  findings: z.array(FindingSchema),
})

export type AuditSection = z.infer<typeof AuditSectionSchema>

export const AuditReportSchema = z.object({
  url: z.string(),
  hostname: z.string(),
  pageLabel: PageLabelSchema,
  generatedAt: z.string(),
  auditDurationMs: z.number(),
  overallScore: z.number(),
  executiveSummary: z.string(),
  sections: z.array(AuditSectionSchema),
  topFixes: z.array(TopFixSchema),
  platform: z.string().nullable(),
  detectedApps: z.array(DetectedAppSchema),
  missingApps: z.array(RecommendedAppSchema),
  screenshots: z.object({
    desktop: z.string().url(),
    mobile: z.string().url(),
  }),
  socialPreview: z.object({
    ogImage: z.string().nullable(),
    ogTitle: z.string().nullable(),
    ogDescription: z.string().nullable(),
  }),
  lighthouse: z.object({
    mobile: LighthouseScoresSchema,
    desktop: LighthouseScoresSchema,
  }),
  unavailableSections: z.array(z.string()),
})

export type AuditReport = z.infer<typeof AuditReportSchema>

// ============================================================
// API Response
// ============================================================

export interface ApiResponse<T> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
  readonly details?: unknown
}

// ============================================================
// Audit History
// ============================================================

export interface AuditHistoryEntry {
  readonly auditId: string
  readonly url: string
  readonly hostname: string
  readonly overallScore: number | null
  readonly status: 'running' | 'complete' | 'failed'
  readonly createdAt: string
  readonly reportUrl: string | null
}
