import { z } from 'zod'

const EnvSchema = z.object({
  // Required API keys — audit cannot run without these
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  SCREENSHOTONE_API_KEY: z.string().min(1, 'SCREENSHOTONE_API_KEY is required'),
  PAGESPEED_API_KEY: z.string().min(1, 'PAGESPEED_API_KEY is required'),

  // Optional — SERP collector degrades gracefully
  GOOGLE_CSE_API_KEY: z.string().optional(),
  GOOGLE_CSE_ID: z.string().optional(),

  // Optional — debug panel auth
  DEBUG_PASSWORD_HASH: z.string().optional(),

  // Optional — storage (required for screenshots + history)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
})

type Env = z.infer<typeof EnvSchema>

let _env: Env | null = null

export function getEnv(): Env {
  if (_env) return _env

  const result = EnvSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ')
    throw new Error(`Missing or invalid environment variables: ${missing}`)
  }

  _env = result.data
  return _env
}

export function getGeminiKey(): string {
  return getEnv().GEMINI_API_KEY
}

export function getOpenAiKey(): string {
  return getEnv().OPENAI_API_KEY
}

export function getAnthropicKey(): string {
  return getEnv().ANTHROPIC_API_KEY
}

export function getScreenshotOneKey(): string {
  return getEnv().SCREENSHOTONE_API_KEY
}

export function getPageSpeedKey(): string {
  return getEnv().PAGESPEED_API_KEY
}

export function getGoogleCseKeys(): {
  apiKey: string
  cseId: string
} | null {
  const env = getEnv()
  if (env.GOOGLE_CSE_API_KEY && env.GOOGLE_CSE_ID) {
    return { apiKey: env.GOOGLE_CSE_API_KEY, cseId: env.GOOGLE_CSE_ID }
  }
  return null
}

export function getBlobToken(): string | undefined {
  return getEnv().BLOB_READ_WRITE_TOKEN
}
