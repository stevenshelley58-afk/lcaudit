'use client'

import { useState, useRef } from 'react'
import { UrlInput } from '@/components/UrlInput'
import { AuditReport } from '@/components/AuditReport'
import type { AuditReport as AuditReportType } from '@/lib/types'

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [report, setReport] = useState<AuditReportType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<unknown>(null)
  const lastUrl = useRef<string>('')

  async function handleAudit(url: string) {
    setIsLoading(true)
    setError(null)
    setErrorDetails(null)
    setReport(null)
    lastUrl.current = url

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error ?? 'Audit failed')
        if (data.details) setErrorDetails(data.details)
        return
      }

      setReport(data.data as AuditReportType)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleRetry() {
    if (lastUrl.current) {
      handleAudit(lastUrl.current)
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

      {report && (
        <div className="mt-10 w-full flex justify-center">
          <AuditReport report={report} />
        </div>
      )}
    </main>
  )
}
