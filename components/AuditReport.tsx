'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, ChevronDown, Cpu, Package, Wrench } from 'lucide-react'
import { ScoreGauge } from '@/components/ScoreGauge'
import { SectionCard } from '@/components/SectionCard'
import type { AuditReport as AuditReportType, TopFix, DetectedApp, RecommendedApp } from '@/lib/types'

interface AuditReportProps {
  readonly report: AuditReportType
}

function TopFixCard({
  fix,
  index,
}: {
  readonly fix: TopFix
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

function TopFixesCard({ fixes }: { readonly fixes: readonly TopFix[] }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-light/50 transition-colors"
      >
        <Wrench size={20} className="text-medium mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="text-base font-semibold text-black">
              Top fixes to prioritise
            </h3>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-danger">
              {fixes.length} fix{fixes.length !== 1 ? 'es' : ''}
            </span>
          </div>
          <p className="text-sm text-medium leading-relaxed">
            The highest-impact issues to address first, ranked by priority.
          </p>
        </div>
        <div className="flex items-center shrink-0 mt-1">
          <ChevronDown
            size={16}
            className={`text-medium transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {fixes.map((fix, i) => (
            <TopFixCard key={`${fix.title}-${i}`} fix={fix} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function AppTag({ name, category }: { readonly name: string; readonly category: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-light rounded-xl text-sm">
      <Package size={14} className="text-medium shrink-0" />
      <span className="text-dark font-medium">{name}</span>
      <span className="text-xs text-medium">{category}</span>
    </div>
  )
}

export function AuditReport({ report }: AuditReportProps) {
  return (
    <div className="w-full max-w-3xl space-y-6 animate-fade-in">
      {/* Executive Summary */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6">
        <ScoreGauge score={report.overallScore} />
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

      {/* Screenshots */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-black mb-4">Screenshots</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-medium uppercase tracking-wide font-semibold mb-2">
              Desktop
            </p>
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-light border border-gray-100">
              <Image
                src={report.screenshots.desktop}
                alt={`Desktop screenshot of ${report.hostname}`}
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-medium uppercase tracking-wide font-semibold mb-2">
              Mobile
            </p>
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-light border border-gray-100">
              <Image
                src={report.screenshots.mobile}
                alt={`Mobile screenshot of ${report.hostname}`}
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top Fixes */}
      {report.topFixes.length > 0 && (
        <TopFixesCard fixes={report.topFixes} />
      )}

      {/* Unavailable Sections Warning */}
      {report.unavailableSections.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-[32px] p-4 text-sm text-dark">
          <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-warning">Note:</span>{' '}
            {report.unavailableSections.length} section
            {report.unavailableSections.length > 1 ? 's' : ''} could not be
            analysed: {report.unavailableSections.join(', ')}.
          </div>
        </div>
      )}

      {/* Section Cards */}
      <div className="space-y-4">
        {report.sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>

      {/* Social Preview */}
      {(report.socialPreview.ogTitle || report.socialPreview.ogImage) && (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-black mb-4">
            Social Preview
          </h2>
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            {report.socialPreview.ogImage && (
              <div className="relative w-full aspect-[1.91/1] bg-light">
                <Image
                  src={report.socialPreview.ogImage}
                  alt="Open Graph preview image"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 640px"
                />
              </div>
            )}
            <div className="p-4">
              {report.socialPreview.ogTitle && (
                <p className="font-semibold text-dark text-sm">
                  {report.socialPreview.ogTitle}
                </p>
              )}
              {report.socialPreview.ogDescription && (
                <p className="text-xs text-medium mt-1 line-clamp-2">
                  {report.socialPreview.ogDescription}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detected Apps + Missing Apps */}
      {(report.detectedApps.length > 0 || report.missingApps.length > 0) && (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {report.detectedApps.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={16} className="text-success" />
                  <h3 className="text-sm font-bold text-black">
                    Detected Apps
                  </h3>
                </div>
                <div className="space-y-2">
                  {report.detectedApps.map((app: DetectedApp) => (
                    <AppTag
                      key={app.name}
                      name={`${app.name}${app.version ? ` (${app.version})` : ''}`}
                      category={app.category}
                    />
                  ))}
                </div>
              </div>
            )}
            {report.missingApps.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-warning" />
                  <h3 className="text-sm font-bold text-black">
                    Missing Apps
                  </h3>
                </div>
                <div className="space-y-2">
                  {report.missingApps.map((app: RecommendedApp) => (
                    <AppTag
                      key={app.name}
                      name={app.name}
                      category={app.reason}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Platform */}
      {report.platform && (
        <div className="text-center text-xs text-medium py-2">
          Built on <span className="font-semibold">{report.platform}</span>
        </div>
      )}
    </div>
  )
}
