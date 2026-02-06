'use client'

import { useState, useRef } from 'react'
import { UrlInput } from '@/components/UrlInput'
import { AuditReport } from '@/components/AuditReport'
import type { AuditReport as AuditReportType, AuditPage } from '@/lib/types'

const PAGE_LABEL_DISPLAY: Record<string, string> = {
  'homepage': 'Homepage',
  'product-page': 'Product Page',
}

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [reports, setReports] = useState<readonly AuditReportType[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [partialErrors, setPartialErrors] = useState<readonly string[]>([])
  const [errorDetails, setErrorDetails] = useState<unknown>(null)
  const lastPages = useRef<readonly AuditPage[]>([])

  async function handleAudit(pages: readonly AuditPage[]) {
    setIsLoading(true)
    setError(null)
    setErrorDetails(null)
    setReports([])
    setPartialErrors([])
    setActiveTab(0)
    lastPages.current = pages

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error ?? 'Audit failed')
        if (data.details) setErrorDetails(data.details)
        return
      }

      setReports(data.data.reports as AuditReportType[])
      if (data.data.errors) {
        setPartialErrors(data.data.errors as string[])
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleRetry() {
    if (lastPages.current.length > 0) {
      handleAudit(lastPages.current)
    }
  }

  const activeReport = reports[activeTab] ?? null

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
        <div className="mt-12 flex flex-col items-center gap-3 animate-fade-in">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse-dot" />
            <span className="w-2 h-2 rounded-full bg-black animate-pulse-dot [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-black animate-pulse-dot [animation-delay:300ms]" />
          </div>
          <p className="text-medium text-sm">
            Analysing — this may take up to 60 seconds...
          </p>
        </div>
      )}

      {error && (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-[32px] text-danger max-w-xl w-full animate-fade-in">
          <p className="text-center font-medium">{error}</p>
          {errorDetails != null ? (
            <details className="mt-3 text-left">
              <summary className="text-xs text-medium cursor-pointer hover:text-dark">
                Show details
              </summary>
              <pre className="mt-2 p-3 bg-white/80 rounded-xl text-xs text-dark font-mono overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                {typeof errorDetails === 'string'
                  ? errorDetails
                  : JSON.stringify(errorDetails, null, 2)}
              </pre>
            </details>
          ) : null}
          <div className="text-center">
            <button
              type="button"
              onClick={handleRetry}
              className="mt-3 px-4 py-1.5 rounded-full bg-danger text-white text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {partialErrors.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-[32px] text-sm text-dark max-w-xl w-full animate-fade-in">
          <p className="font-medium text-warning text-center mb-1">
            Partial errors
          </p>
          {partialErrors.map((err) => (
            <p key={err} className="text-xs text-medium text-center">{err}</p>
          ))}
        </div>
      )}

      {reports.length > 0 && (
        <div className="mt-10 w-full flex flex-col items-center">
          {reports.length > 1 && (
            <div className="flex gap-2 mb-6">
              {reports.map((r, i) => (
                <button
                  key={r.pageLabel}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeTab === i
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-dark hover:bg-gray-200'
                  }`}
                >
                  {PAGE_LABEL_DISPLAY[r.pageLabel] ?? r.pageLabel}
                </button>
              ))}
            </div>
          )}

          {activeReport && (
            <div className="w-full flex justify-center">
              <AuditReport report={activeReport} />
            </div>
          )}
        </div>
      )}
    </main>
  )
}
