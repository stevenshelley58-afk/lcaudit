'use client'

import { useState, type FormEvent } from 'react'

interface UrlInputProps {
  readonly onSubmit: (url: string) => void
  readonly isLoading: boolean
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    let normalised = url.trim()
    if (!normalised) {
      setError('Please enter a URL')
      return
    }

    // Auto-prepend https:// if no scheme
    if (!/^https?:\/\//i.test(normalised)) {
      normalised = `https://${normalised}`
    }

    // Basic client-side URL validation
    try {
      new URL(normalised)
    } catch {
      setError('Please enter a valid URL')
      return
    }

    onSubmit(normalised)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center gap-2 rounded-full bg-white border border-gray-200 shadow-sm px-4 py-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter any website URL..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-black placeholder-medium outline-none text-base min-w-0"
          aria-label="Website URL"
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="shrink-0 rounded-full bg-black text-white px-6 py-2 text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-80"
          aria-label="Start audit"
        >
          {isLoading ? 'Auditing...' : 'Audit'}
        </button>
      </div>
      {error && (
        <p className="text-danger text-sm mt-2 px-4" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
