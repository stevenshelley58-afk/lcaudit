'use client'

import { useState } from 'react'
import { ChevronDown, Eye, Gauge, Search, Accessibility, Shield, Share2, Layers, FileText, Circle } from 'lucide-react'
import { FindingCard } from '@/components/FindingCard'
import type { AuditSection, Rating } from '@/lib/types'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  eye: Eye,
  gauge: Gauge,
  search: Search,
  accessibility: Accessibility,
  shield: Shield,
  'share-2': Share2,
  layers: Layers,
  'file-text': FileText,
  circle: Circle,
}

const RATING_STYLES: Record<Rating, { bg: string; text: string; label: string }> = {
  Good: { bg: 'bg-emerald-50', text: 'text-success', label: 'Good' },
  'Needs Work': { bg: 'bg-amber-50', text: 'text-warning', label: 'Needs Work' },
  Critical: { bg: 'bg-red-50', text: 'text-danger', label: 'Critical' },
  Error: { bg: 'bg-gray-100', text: 'text-medium', label: 'Error' },
}

interface SectionCardProps {
  readonly section: AuditSection
}

export function SectionCard({ section }: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const IconComponent = ICON_MAP[section.iconKey] ?? Circle
  const ratingStyle = RATING_STYLES[section.rating]

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-light/50 transition-colors"
      >
        <IconComponent size={20} className="text-medium mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="text-base font-semibold text-black">
              {section.title}
            </h3>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${ratingStyle.bg} ${ratingStyle.text}`}
            >
              {ratingStyle.label}
            </span>
            {section.score !== null && (
              <span className="text-xs text-medium font-mono">
                {section.score}/100
              </span>
            )}
          </div>
          <p className="text-sm text-medium leading-relaxed">
            {section.eli5Summary}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <span className="text-medium text-sm">
            {section.findings.length} finding
            {section.findings.length !== 1 ? 's' : ''}
          </span>
          <ChevronDown
            size={16}
            className={`text-medium transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
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
              <FindingCard key={finding.id} finding={finding} />
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
