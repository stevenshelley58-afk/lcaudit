import { zodToJsonSchema } from 'zod-to-json-schema'
import { ThinkingLevel } from '@google/genai'
import { getOpenAiClient, getGeminiClient } from '@/lib/ai'
import { AnalysisResultSchema } from '@/lib/types'
import type { CollectedData, AnalysisResult, Finding } from '@/lib/types'

// --- Heuristic pre-computation (used as AI input + last-resort fallback) ---

function getHeaderDescription(header: string): string {
  const descriptions: Record<string, string> = {
    'strict-transport-security':
      'Tells browsers to always use HTTPS, preventing protocol downgrade attacks.',
    'content-security-policy':
      'Controls which resources the browser is allowed to load, preventing XSS and injection attacks.',
    'x-frame-options':
      'Prevents the site from being embedded in iframes, blocking clickjacking attacks.',
    'x-content-type-options':
      'Prevents browsers from MIME-sniffing the content type, reducing drive-by download attacks.',
    'referrer-policy':
      'Controls how much referrer information is sent with requests, protecting user privacy.',
    'permissions-policy':
      'Controls which browser features (camera, microphone, geolocation) the site can use.',
  }
  return descriptions[header] ?? `The ${header} security header is not configured.`
}

function getHeaderImpact(header: string): 'High' | 'Medium' | 'Low' {
  const highImpact = ['strict-transport-security', 'content-security-policy']
  const mediumImpact = ['x-frame-options', 'x-content-type-options']
  if (highImpact.includes(header)) return 'High'
  if (mediumImpact.includes(header)) return 'Medium'
  return 'Low'
}

function getHeaderFix(header: string): string {
  const fixes: Record<string, string> = {
    'strict-transport-security':
      'Add the header: Strict-Transport-Security: max-age=31536000; includeSubDomains',
    'content-security-policy':
      "Start with a report-only CSP and gradually tighten: Content-Security-Policy-Report-Only: default-src 'self'",
    'x-frame-options':
      'Add the header: X-Frame-Options: DENY (or SAMEORIGIN if you need iframes)',
    'x-content-type-options':
      'Add the header: X-Content-Type-Options: nosniff',
    'referrer-policy':
      'Add the header: Referrer-Policy: strict-origin-when-cross-origin',
    'permissions-policy':
      'Add the header: Permissions-Policy: camera=(), microphone=(), geolocation=()',
  }
  return fixes[header] ?? `Configure the ${header} header on the web server.`
}

function buildHeuristicResult(data: CollectedData): AnalysisResult {
  const { sslDns, securityHeaders } = data
  const findings: Finding[] = []

  if (sslDns) {
    findings.push({
      id: 'sec-001',
      title: sslDns.isHttps ? 'HTTPS is enabled' : 'Site not using HTTPS',
      description: sslDns.isHttps
        ? 'The site is served over HTTPS, encrypting data in transit.'
        : 'The site is not served over HTTPS. All data is transmitted in plain text.',
      evidence: sslDns.isHttps
        ? `HTTPS active, certificate issued by ${sslDns.certIssuer ?? 'unknown issuer'}`
        : 'Site responds on HTTP without redirect to HTTPS',
      evidenceType: 'HEADER',
      evidenceDetail: 'SSL/TLS',
      impact: sslDns.isHttps ? 'Low' : 'High',
      fix: sslDns.isHttps
        ? 'No action needed. Ensure certificate auto-renewal is configured.'
        : 'Install an SSL certificate and redirect all HTTP traffic to HTTPS.',
      category: 'Encryption',
      section: 'Security & Trust',
    })

    if (sslDns.redirectChain.length > 2) {
      findings.push({
        id: 'sec-002',
        title: 'Excessive redirect chain',
        description: `The URL goes through ${sslDns.redirectChain.length} redirects before reaching the final destination.`,
        evidence: sslDns.redirectChain.map((hop) => `${hop.statusCode} → ${hop.url}`).join(' → '),
        evidenceType: 'HEADER',
        evidenceDetail: 'Redirect chain',
        impact: 'Medium',
        fix: 'Reduce redirect chains to a single hop.',
        category: 'Redirects',
        section: 'Security & Trust',
      })
    }
  }

  if (securityHeaders) {
    for (const header of securityHeaders.missingHeaders) {
      findings.push({
        id: `sec-hdr-${header.replace(/[^a-z0-9]/gi, '-')}`,
        title: `Missing security header: ${header}`,
        description: getHeaderDescription(header),
        evidence: `Header "${header}" not present in response`,
        evidenceType: 'HEADER',
        evidenceDetail: header,
        impact: getHeaderImpact(header),
        fix: getHeaderFix(header),
        category: 'Headers',
        section: 'Security & Trust',
      })
    }
  }

  if (!sslDns && !securityHeaders) {
    findings.push({
      id: 'sec-nodata',
      title: 'Security data unavailable',
      description: 'Could not collect SSL/DNS or security header data for analysis.',
      evidence: 'Both sslDns and securityHeaders collectors returned null',
      evidenceType: 'MISSING',
      evidenceDetail: 'SSL and security header data expected',
      impact: 'High',
      fix: 'Ensure the site is accessible and retry the audit.',
      category: 'Data',
      section: 'Security & Trust',
    })
  }

  const criticalCount = findings.filter((f) => f.impact === 'High').length

  return {
    sectionTitle: 'Security & Trust',
    eli5Summary: criticalCount >= 3
      ? 'The site is missing several important security protections.'
      : 'The site has basic security in place but could be hardened further.',
    whyItMatters: 'Security headers protect visitors from attacks like clickjacking, XSS, and data interception.',
    overallRating: criticalCount >= 3 ? 'Critical' : criticalCount >= 1 ? 'Needs Work' : 'Good',
    score: criticalCount >= 3 ? 25 : criticalCount >= 1 ? 55 : 85,
    findings,
  }
}

// --- AI-enhanced analysis ---

function buildPrompt(data: CollectedData): string {
  const { sslDns, securityHeaders } = data

  return `You are a web security analyst. Analyse this security data and return findings.

DATA:
- HTTPS: ${sslDns ? (sslDns.isHttps ? `Yes, cert issuer: ${sslDns.certIssuer ?? 'unknown'}, expires: ${sslDns.certExpiry ?? 'unknown'}` : 'No') : 'data unavailable'}
- Protocol: ${sslDns?.protocol ?? 'unknown'}
- Redirect chain: ${sslDns ? (sslDns.redirectChain.length > 0 ? sslDns.redirectChain.map((h) => `${h.statusCode} ${h.url}`).join(' → ') : 'direct') : 'unknown'}
- Security headers present: ${securityHeaders ? Object.entries(securityHeaders.headers).filter(([, v]) => v !== null).map(([k, v]) => `${k}: ${v}`).join('; ') || 'none' : 'data unavailable'}
- Missing headers: ${securityHeaders?.missingHeaders.join(', ') || 'none'}
- Security grade: ${securityHeaders?.grade ?? 'unknown'}

RULES:
- sectionTitle must be "Security & Trust"
- Every finding must cite real data as evidence
- evidenceType should be "HEADER" for header/SSL findings, "MISSING" for missing data
- section must be "Security & Trust" for all findings
- Check: HTTPS, cert expiry, redirect chain length, each missing header, CSP quality, HSTS configuration
- Rating: Good (HTTPS + ≤ 1 missing critical header), Needs Work (HTTPS + 2+ missing), Critical (no HTTPS OR no HSTS+CSP)
- Score: 0-100 based on security posture
- Use English spelling (analyse, colour, organisation). No slang, no colloquialisms, no em dashes.`
}

async function callOpenAi(data: CollectedData): Promise<AnalysisResult> {
  const client = getOpenAiClient()
  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    instructions: 'You are a web security analyst. Return structured findings with evidence.',
    input: [{ role: 'user', content: buildPrompt(data) }],
    text: {
      format: {
        type: 'json_schema',
        name: 'security_analysis',
        strict: true,
        schema: zodToJsonSchema(AnalysisResultSchema) as Record<string, unknown>,
      },
    },
    temperature: 0.4,
    store: false,
  })
  return JSON.parse(response.output_text)
}

async function callGeminiFallback(data: CollectedData): Promise<AnalysisResult> {
  const client = getGeminiClient()
  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: buildPrompt(data) }] }],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: zodToJsonSchema(AnalysisResultSchema) as Record<string, unknown>,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  })
  return JSON.parse(response.text ?? '{}')
}

export async function analyseSecurity(
  data: CollectedData,
): Promise<AnalysisResult> {
  try {
    return await callOpenAi(data)
  } catch {
    try {
      return await callGeminiFallback(data)
    } catch {
      return buildHeuristicResult(data)
    }
  }
}
