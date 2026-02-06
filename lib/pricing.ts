interface ModelPricing {
  readonly promptPer1M: number
  readonly completionPer1M: number
}

const MODEL_PRICING: Readonly<Record<string, ModelPricing>> = {
  // Google Gemini
  'gemini-3-pro-preview': { promptPer1M: 1.25, completionPer1M: 10.0 },
  'gemini-3-flash-preview': { promptPer1M: 0.15, completionPer1M: 0.60 },

  // OpenAI
  'gpt-4o-mini': { promptPer1M: 0.15, completionPer1M: 0.60 },
  'gpt-4o': { promptPer1M: 2.50, completionPer1M: 10.0 },
  'gpt-5': { promptPer1M: 2.00, completionPer1M: 8.00 },

  // Anthropic (fallback)
  'claude-sonnet-4-5-20250929': { promptPer1M: 3.00, completionPer1M: 15.0 },
}

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) {
    return 0
  }

  const promptCost = (promptTokens / 1_000_000) * pricing.promptPer1M
  const completionCost =
    (completionTokens / 1_000_000) * pricing.completionPer1M

  return promptCost + completionCost
}

export function getModelPricing(model: string): ModelPricing | null {
  return MODEL_PRICING[model] ?? null
}
