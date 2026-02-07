import { getScreenshotOneKey } from '@/lib/env'
import { storeScreenshot } from '@/lib/storage'
import { fetchWithRetry } from '@/lib/utils'
import { SCREENSHOTONE_API_URL, SCREENSHOT_CONFIG } from '@/lib/constants'
import type { ScreenshotBuffers } from '@/lib/types'

export async function collectScreenshots(
  url: string,
  auditId: string,
): Promise<ScreenshotBuffers> {
  const apiKey = getScreenshotOneKey()

  const [desktopArrayBuffer, mobileArrayBuffer] = await Promise.all([
    captureScreenshot(url, apiKey, SCREENSHOT_CONFIG.desktop),
    captureScreenshot(url, apiKey, SCREENSHOT_CONFIG.mobile),
  ])

  const desktopBuffer = Buffer.from(desktopArrayBuffer)
  const mobileBuffer = Buffer.from(mobileArrayBuffer)

  // Fire blob uploads in background — don't block the pipeline
  const desktopBlobUrl = storeScreenshot(auditId, 'desktop', desktopArrayBuffer)
  const mobileBlobUrl = storeScreenshot(auditId, 'mobile', mobileArrayBuffer)

  // Prevent unhandled rejection if uploads fail before anyone awaits
  desktopBlobUrl.catch(() => {})
  mobileBlobUrl.catch(() => {})

  return { desktopBuffer, mobileBuffer, desktopBlobUrl, mobileBlobUrl }
}

async function captureScreenshot(
  url: string,
  apiKey: string,
  viewport: { readonly width: number; readonly height: number },
): Promise<ArrayBuffer> {
  const params = new URLSearchParams({
    access_key: apiKey,
    url,
    viewport_width: String(viewport.width),
    viewport_height: String(viewport.height),
    format: 'png',
    full_page: 'true',
    full_page_max_height: String(SCREENSHOT_CONFIG.fullPageMaxHeight),
    delay: '3',
    cache: 'false',
    block_cookie_banners: 'true',
    block_banners_by_heuristics: 'true',
    block_chats: 'true',
    block_ads: 'true',
  })

  return fetchWithRetry(
    async () => {
      const response = await fetch(`${SCREENSHOTONE_API_URL}?${params}`)

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new Error(
          `ScreenshotOne error ${response.status}: ${body || response.statusText}`,
        )
      }

      return response.arrayBuffer()
    },
    2,
    `screenshot-${viewport.width}x${viewport.height}`,
  )
}
