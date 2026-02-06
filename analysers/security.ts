import type { CollectedData, AnalysisResult, Finding } from '@/lib/types'

// Model: gpt-4o-mini (header checking, simple rules)
// Data in: sslDns, securityHeaders

function getHeaderDescription(header: string): string {
  const descriptions: Record<string, string> = {
    'strict-transport-security':
      'Tells browsers to always use HTTPS, preventing protocol downgrade attacks.',
    'content-security-policy':
      'Controls which resources the browser is allowed to load, preventing XSS and injection attacks.',
    'x-frame-options':
      'Prevents your site from being embedded in iframes, blocking clickjacking attacks.',
    'x-content-type-options':
      'Prevents browsers from MIME-sniffing the content type, reducing drive-by download attacks.',
    'referrer-policy':
      'Controls how much referrer information is sent with requests, protecting user privacy.',
    'permissions-policy':
      'Controls which browser features (camera, microphone, geolocation) your site can use.',
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
      'Start with a report-only CSP and gradually tighten: Content-Security-Policy-Report-Only: default-src \'self\'',
    'x-frame-options':
      'Add the header: X-Frame-Options: DENY (or SAMEORIGIN if you need iframes)',
    'x-content-type-options':
      'Add the header: X-Content-Type-Options: nosniff',
    'referrer-policy':
      'Add the header: Referrer-Policy: strict-origin-when-cross-origin',
    'permissions-policy':
      'Add the header: Permissions-Policy: camera=(), microphone=(), geolocation=()',
  }
  return fixes[header] ?? `Configure the ${header} header on your web server.`
}

function buildSslFindings(
  sslDns: NonNullable<CollectedData['sslDns']>,
): readonly Finding[] {
  const httpsFinding: Finding = {
    id: 'sec-001',
    title: sslDns.isHttps ? 'HTTPS is enabled' : 'Site not using HTTPS',
    description: sslDns.isHttps
      ? 'The site is served over HTTPS, encrypting data in transit.'
      : 'The site is not served over HTTPS. All data between the user and server is transmitted in plain text.',
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
  }

  if (sslDns.redirectChain.length > 2) {
    return [
      httpsFinding,
      {
        id: 'sec-002',
        title: 'Excessive redirect chain',
        description:
          `The URL goes through ${sslDns.redirectChain.length} redirects before reaching the final destination. This adds latency and may confuse search engines.`,
        evidence: sslDns.redirectChain
          .map((hop) => `${hop.statusCode} → ${hop.url}`)
          .join(' → '),
        evidenceType: 'HEADER',
        evidenceDetail: 'Redirect chain',
        impact: 'Medium',
        fix: 'Reduce redirect chains to a single hop (e.g. http → https://www.example.com).',
        category: 'Redirects',
        section: 'Security & Trust',
      },
    ]
  }

  return [httpsFinding]
}

function buildHeaderFindings(
  securityHeaders: NonNullable<CollectedData['securityHeaders']>,
): readonly Finding[] {
  const missingFindings: readonly Finding[] = securityHeaders.missingHeaders.map(
    (header) => ({
      id: `sec-hdr-${header.replace(/[^a-z0-9]/gi, '-')}`,
      title: `Missing security header: ${header}`,
      description: getHeaderDescription(header),
      evidence: `Header "${header}" not present in response`,
      evidenceType: 'HEADER' as const,
      evidenceDetail: header,
      impact: getHeaderImpact(header),
      fix: getHeaderFix(header),
      category: 'Headers',
      section: 'Security & Trust',
    }),
  )

  const presentHeaders = Object.entries(securityHeaders.headers).filter(
    ([, value]) => value !== null,
  )

  if (presentHeaders.length > 0) {
    return [
      ...missingFindings,
      {
        id: 'sec-headers-present',
        title: `${presentHeaders.length} security headers configured`,
        description: `The following security headers are properly set: ${presentHeaders.map(([name]) => name).join(', ')}.`,
        evidence: presentHeaders
          .map(([name, value]) => `${name}: ${value}`)
          .join('\n'),
        evidenceType: 'HEADER',
        evidenceDetail: 'Security headers',
        impact: 'Low',
        fix: 'No action needed. Continue maintaining these headers.',
        category: 'Headers',
        section: 'Security & Trust',
      },
    ]
  }

  return missingFindings
}

export async function analyseSecurity(
  data: CollectedData,
): Promise<AnalysisResult> {
  const { sslDns, securityHeaders } = data

  // TODO: Replace with real AI call — see .claude/skills/api-providers/SKILL.md
  // Will send SSL + header data to OpenAI gpt-4o-mini for deeper analysis

  const findings: readonly Finding[] = [
    ...(sslDns ? buildSslFindings(sslDns) : []),
    ...(securityHeaders ? buildHeaderFindings(securityHeaders) : []),
    ...(!sslDns && !securityHeaders
      ? [
          {
            id: 'sec-nodata',
            title: 'Security data unavailable',
            description:
              'Could not collect SSL/DNS or security header data for analysis.',
            evidence: 'Both sslDns and securityHeaders collectors returned null',
            evidenceType: 'MISSING' as const,
            evidenceDetail: 'SSL and security header data expected',
            impact: 'High' as const,
            fix: 'Ensure the site is accessible and retry the audit.',
            category: 'Data',
            section: 'Security & Trust',
          },
        ]
      : []),
  ]

  const criticalCount = findings.filter((f) => f.impact === 'High').length

  return {
    sectionTitle: 'Security & Trust',
    eli5Summary:
      securityHeaders && securityHeaders.missingHeaders.length > 2
        ? 'Your website is missing several important security protections. Think of it like leaving some doors unlocked — it works, but it\'s not safe.'
        : 'Your website has basic security in place but could be hardened further with additional security headers.',
    whyItMatters:
      'Security headers protect your visitors from attacks like clickjacking, XSS, and data interception. Missing them erodes trust and may affect compliance.',
    overallRating: criticalCount >= 3 ? 'Critical' : criticalCount >= 1 ? 'Needs Work' : 'Good',
    findings: [...findings],
  }
}
