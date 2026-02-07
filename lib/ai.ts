import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { getGeminiKey, getOpenAiKey, getAnthropicKey } from './env'

// Lazy singletons — created once per cold start

let _gemini: GoogleGenAI | null = null
let _geminiAlpha: GoogleGenAI | null = null
let _openai: OpenAI | null = null
let _anthropic: Anthropic | null = null

export function getGeminiClient(): GoogleGenAI {
  if (!_gemini) {
    _gemini = new GoogleGenAI({ apiKey: getGeminiKey() })
  }
  return _gemini
}

export function getGeminiAlphaClient(): GoogleGenAI {
  if (!_geminiAlpha) {
    _geminiAlpha = new GoogleGenAI({
      apiKey: getGeminiKey(),
      apiVersion: 'v1alpha',
    })
  }
  return _geminiAlpha
}

export function getOpenAiClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: getOpenAiKey() })
  }
  return _openai
}

export function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: getAnthropicKey() })
  }
  return _anthropic
}

