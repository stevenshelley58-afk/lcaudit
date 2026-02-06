import { getScreenshotOneKey } from '@/lib/env'
import { storeScreenshot } from '@/lib/storage'
import { fetchWithRetry } from '@/lib/utils'
import { SCREENSHOTONE_API_URL, SCREENSHOT_CONFIG } from '@/lib/constants'
import type { ScreenshotData } from '@/lib/types'

export async function collectScreenshots(
  url: string,
  auditId: string,
): Promise<ScreenshotData> {
  const apiKey = getScreenshotOneKey()

  const [desktopBuffer, mobileBuffer] = await Promise.all([
    captureScreenshot(url, apiKey, SCREENSHOT_CONFIG.desktop),
    captureScreenshot(url, apiKey, SCREENSHOT_CONFIG.mobile),
  ])

  const [desktopBlobUrl, mobileBlobUrl] = await Promise.all([
    storeScreenshot(auditId, 'desktop', desktopBuffer),
    storeScreenshot(auditId, 'mobile', mobileBuffer),
  ])

  return { desktop: desktopBlobUrl, mobile: mobileBlobUrl }
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
