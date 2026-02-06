'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Finding } from '@/lib/types'

const EVIDENCE_TYPE_STYLES: Record<string, string> = {
  HTML: 'bg-blue-50 text-blue-700',
  SCREENSHOT: 'bg-purple-50 text-purple-700',
  METRIC: 'bg-cyan-50 text-cyan-700',
  HEADER: 'bg-slate-100 text-slate-700',
  MISSING: 'bg-amber-50 text-amber-700',
}

const IMPACT_STYLES: Record<string, string> = {
  High: 'text-danger',
  Medium: 'text-warning',
  Low: 'text-medium',
}

interface FindingCardProps {
  readonly finding: Finding
}

export function FindingCard({ finding }: FindingCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  const evidenceStyle =
    EVIDENCE_TYPE_STYLES[finding.evidenceType] ?? 'bg-gray-100 text-gray-700'
  const impactStyle = IMPACT_STYLES[finding.impact] ?? 'text-medium'

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left py-3 px-4 flex items-center gap-3 hover:bg-light transition-colors"
      >
        <span
          className={`text-xs font-semibold w-14 shrink-0 ${impactStyle}`}
        >
          {finding.impact}
        </span>
        <span className="text-sm text-dark flex-1">{finding.title}</span>
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${evidenceStyle}`}
        >
          {finding.evidenceType}
        </span>
        <ChevronDown
          size={16}
          className={`text-medium shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-2 text-sm">
          <p className="text-dark">{finding.description}</p>
          {finding.category && (
            <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-xs text-medium">
              {finding.category}
            </span>
          )}
          <div className="bg-light rounded-[32px] p-4 font-mono text-xs text-dark">
            <span className="text-medium font-sans text-xs uppercase tracking-wide">
              Evidence
            </span>
            <p className="mt-1">{finding.evidence}</p>
            {finding.evidenceDetail && (
              <p className="mt-1 text-medium">{finding.evidenceDetail}</p>
            )}
          </div>
          <div className="bg-emerald-50 rounded-[32px] p-4 text-sm text-dark">
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
