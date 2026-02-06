'use client'

import { useState, type FormEvent } from 'react'
import type { AuditPage } from '@/lib/types'

interface UrlInputProps {
  readonly onSubmit: (pages: readonly AuditPage[]) => void
  readonly isLoading: boolean
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [homepageUrl, setHomepageUrl] = useState('')
  const [productUrl, setProductUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  function normalise(raw: string): string {
    let normalised = raw.trim()
    if (!/^https?:\/\//i.test(normalised)) {
      normalised = `https://${normalised}`
    }
    return normalised
  }

  function isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!homepageUrl.trim()) {
      setError('Please enter a homepage URL')
      return
    }

    const normalisedHomepage = normalise(homepageUrl)
    if (!isValidUrl(normalisedHomepage)) {
      setError('Please enter a valid homepage URL')
      return
    }

    const pages: AuditPage[] = [
      { url: normalisedHomepage, label: 'homepage' },
    ]

    if (productUrl.trim()) {
      const normalisedProduct = normalise(productUrl)
      if (!isValidUrl(normalisedProduct)) {
        setError('Please enter a valid product page URL')
        return
      }
      pages.push({ url: normalisedProduct, label: 'product-page' })
    }

    onSubmit(pages)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div>
        <label htmlFor="homepage-url" className="block text-xs font-medium text-medium mb-1.5 px-1">
          Homepage URL
        </label>
        <div className="relative flex items-center gap-2 rounded-full bg-white border border-gray-200 shadow-sm px-4 py-2">
          <input
            id="homepage-url"
            type="text"
            value={homepageUrl}
            onChange={(e) => setHomepageUrl(e.target.value)}
            placeholder="Enter your homepage URL..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-black placeholder-medium outline-none text-base min-w-0"
            aria-label="Homepage URL"
          />
          <button
            type="submit"
            disabled={isLoading || !homepageUrl.trim()}
            className="shrink-0 rounded-full bg-black text-white px-6 py-2 text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-80"
            aria-label="Start audit"
          >
            {isLoading ? 'Auditing...' : 'Audit'}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="product-url" className="block text-xs font-medium text-medium mb-1.5 px-1">
          Product or service page URL <span className="text-medium/60">(optional)</span>
        </label>
        <div className="relative flex items-center rounded-full bg-white border border-gray-200 shadow-sm px-4 py-2">
          <input
            id="product-url"
            type="text"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="Enter a product or service page URL..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-black placeholder-medium outline-none text-base min-w-0"
            aria-label="Product or service page URL"
          />
        </div>
      </div>

      {error && (
        <p className="text-danger text-sm px-4" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
