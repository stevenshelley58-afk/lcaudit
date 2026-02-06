'use client'

import { useState, useRef } from 'react'
import { IdleView } from '@/components/IdleView'
import { LoadingView } from '@/components/LoadingView'
import { AuditReport } from '@/components/AuditReport'
import type { AuditReport as AuditReportType } from '@/lib/types'

type AppState = 'idle' | 'loading' | 'error' | 'complete'

export default function HomePage() {
  const [state, setState] = useState<AppState>('idle')
  const [report, setReport] = useState<AuditReportType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<unknown>(null)
  const lastUrl = useRef<string>('')

  async function handleAudit(url: string) {
    setState('loading')
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

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        const text = await response.text()
        const statusLabel = response.status === 504 ? 'Function timed out' : `HTTP ${response.status}`
        setError(`${statusLabel}: The audit took too long. Try again — some sites take longer on first run.`)
        setErrorDetails({ status: response.status, body: text.slice(0, 500) })
        setState('error')
        return
      }

      const data = await response.json()

      if (!data.success) {
        setError(data.error ?? 'Audit failed')
        if (data.details) setErrorDetails(data.details)
        setState('error')
        return
      }

      setReport(data.data as AuditReportType)
      setState('complete')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`Network error: ${message}`)
      setErrorDetails({
        type: err instanceof TypeError ? 'TypeError (likely timeout or connection failure)' : typeof err,
        message,
      })
      setState('error')
    }
  }

  function handleRetry() {
    if (lastUrl.current) {
      handleAudit(lastUrl.current)
    }
  }

  function handleReset() {
    setState('idle')
    setReport(null)
    setError(null)
    setErrorDetails(null)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-lg font-semibold text-black tracking-tight hover:opacity-70 transition-opacity"
          >
            lcaudit
          </button>
          {state !== 'idle' && (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-medium hover:text-black transition-colors"
            >
              New audit
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        {state === 'idle' && <IdleView onSubmit={handleAudit} />}

        {state === 'loading' && <LoadingView url={lastUrl.current} />}

        {state === 'error' && (
          <div className="w-full max-w-xl animate-fade-in space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-[32px] text-danger">
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
          </div>
        )}

        {state === 'complete' && report && (
          <div className="w-full flex justify-center animate-fade-in">
            <AuditReport report={report} />
          </div>
        )}
      </main>
    </div>
  )
}
