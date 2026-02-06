'use client'

import { useState } from 'react'
import { UrlInput } from '@/components/UrlInput'
import type { AuditReport, AuditSection, Finding, Rating } from '@/lib/types'

const RATING_STYLES: Record<Rating, { bg: string; text: string; label: string }> = {
  Good: { bg: 'bg-emerald-50', text: 'text-success', label: 'Good' },
  'Needs Work': { bg: 'bg-amber-50', text: 'text-warning', label: 'Needs Work' },
  Critical: { bg: 'bg-red-50', text: 'text-danger', label: 'Critical' },
  Error: { bg: 'bg-gray-100', text: 'text-medium', label: 'Error' },
}

function RatingBadge({ rating }: { readonly rating: Rating }) {
  const style = RATING_STYLES[rating]
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

function ScoreRing({ score }: { readonly score: number }) {
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (score / 100) * circumference
  const colour =
    score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-gray-200"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={colour}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <span className="absolute text-2xl font-bold text-black">{score}</span>
    </div>
  )
}

function FindingRow({ finding }: { readonly finding: Finding }) {
  const [isOpen, setIsOpen] = useState(false)

  const impactColour =
    finding.impact === 'High'
      ? 'text-danger'
      : finding.impact === 'Medium'
        ? 'text-warning'
        : 'text-medium'

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left py-3 px-4 flex items-center gap-3 hover:bg-light transition-colors"
      >
        <span className={`text-xs font-semibold w-16 shrink-0 ${impactColour}`}>
          {finding.impact}
        </span>
        <span className="text-sm text-dark flex-1">{finding.title}</span>
        <span className="text-medium text-xs">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-2 text-sm">
          <p className="text-dark">{finding.description}</p>
          <div className="bg-light rounded-lg p-3 font-mono text-xs text-dark">
            <span className="text-medium font-sans text-xs uppercase tracking-wide">
              Evidence ({finding.evidenceType})
            </span>
            <p className="mt-1">{finding.evidence}</p>
            {finding.evidenceDetail && (
              <p className="mt-1 text-medium">{finding.evidenceDetail}</p>
            )}
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-sm text-dark">
            <span className="text-success text-xs uppercase tracking-wide font-semibold">
              Fix
            </span>
            <p className="mt-1">{finding.fix}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionCard({ section }: { readonly section: AuditSection }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-light/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-base font-semibold text-black">{section.title}</h3>
            <RatingBadge rating={section.rating} />
          </div>
          <p className="text-sm text-medium leading-relaxed">{section.eli5Summary}</p>
        </div>
        <span className="text-medium text-sm mt-1 shrink-0">
          {section.findings.length} finding{section.findings.length !== 1 ? 's' : ''}
          {' '}{isExpanded ? '\u25B2' : '\u25BC'}
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-gray-100">
          <div className="px-5 py-3 bg-light/50">
            <p className="text-xs text-medium uppercase tracking-wide font-semibold mb-1">
              Why it matters
            </p>
            <p className="text-sm text-dark">{section.whyItMatters}</p>
          </div>
          {section.findings.length > 0 ? (
            section.findings.map((finding) => (
              <FindingRow key={finding.id} finding={finding} />
            ))
          ) : (
            <div className="px-5 py-4 text-sm text-medium">
              No findings available for this section.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TopFixCard({
  fix,
  index,
}: {
  readonly fix: { readonly title: string; readonly section: string; readonly description: string }
  readonly index: number
}) {
  return (
    <div className="flex gap-3 items-start">
      <span className="shrink-0 w-6 h-6 rounded-full bg-danger text-white text-xs font-bold flex items-center justify-center">
        {index + 1}
      </span>
      <div>
        <p className="text-sm font-semibold text-dark">{fix.title}</p>
        <p className="text-xs text-medium mt-0.5">{fix.section}</p>
        <p className="text-sm text-dark mt-1">{fix.description}</p>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [report, setReport] = useState<AuditReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAudit(url: string) {
    setIsLoading(true)
    setError(null)
    setReport(null)

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error ?? 'Audit failed')
        return
      }

      setReport(data.data as AuditReport)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16">
      <h1 className="text-4xl md:text-5xl font-bold text-black mb-2 text-center">
        Audit your website. Instantly.
      </h1>
      <p className="text-medium mb-8 text-center max-w-md">
        Comprehensive, evidence-backed audit in under 60 seconds.
      </p>

      <div className="w-full max-w-xl">
        <UrlInput onSubmit={handleAudit} isLoading={isLoading} />
      </div>

      {isLoading && (
        <div className="mt-12 text-medium text-sm animate-pulse">
          Running audit — this may take up to 60 seconds...
        </div>
      )}

      {error && (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-2xl text-danger max-w-xl w-full text-center">
          {error}
        </div>
      )}

      {report && (
        <div className="mt-10 w-full max-w-3xl space-y-6">
          {/* Score + Executive Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6">
            <ScoreRing score={report.overallScore} />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                <h2 className="text-xl font-bold text-black">{report.hostname}</h2>
                <span className="text-xs text-medium font-mono">
                  {(report.auditDurationMs / 1000).toFixed(1)}s
                </span>
              </div>
              <p className="text-sm text-dark leading-relaxed">
                {report.executiveSummary}
              </p>
            </div>
          </div>

          {/* Top Fixes */}
          {report.topFixes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-black mb-4">
                Top fixes to prioritise
              </h2>
              <div className="space-y-4">
                {report.topFixes.map((fix, i) => (
                  <TopFixCard key={fix.title} fix={fix} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Unavailable sections warning */}
          {report.unavailableSections.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-dark">
              <span className="font-semibold text-warning">Note:</span>{' '}
              {report.unavailableSections.length} section{report.unavailableSections.length > 1 ? 's' : ''} could
              not be analysed:{' '}
              {report.unavailableSections.join(', ')}.
            </div>
          )}

          {/* Section Cards */}
          <div className="space-y-4">
            {report.sections.map((section) => (
              <SectionCard key={section.id} section={section} />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
