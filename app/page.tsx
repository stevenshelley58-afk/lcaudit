'use client'

import { useState } from 'react'
import { UrlInput } from '@/components/UrlInput'
import type { CollectedData } from '@/lib/types'

interface AuditResult {
  readonly auditId: string
  readonly url: string
  readonly hostname: string
  readonly durationMs: number
  readonly collectedData: CollectedData
}

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAudit(url: string) {
    setIsLoading(true)
    setError(null)
    setResult(null)

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

      setResult(data.data as AuditResult)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
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
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-[32px] text-danger max-w-xl w-full text-center">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 w-full max-w-xl">
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-black">
                {result.hostname}
              </h2>
              <span className="text-xs text-medium font-mono">
                {(result.durationMs / 1000).toFixed(1)}s
              </span>
            </div>
            <pre className="text-xs overflow-auto max-h-96 text-dark font-mono bg-light rounded-2xl p-4">
              {JSON.stringify(result.collectedData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </main>
  )
}
