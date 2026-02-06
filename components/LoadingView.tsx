'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { TerminalLog, type LogEntry } from '@/components/TerminalLog'

interface LoadingViewProps {
  readonly url: string
}

const STATUS_MESSAGES = [
  'Pretending to understand your website...',
  'Asking three AIs and hoping one is right...',
  'Hallucinating findings with confidence...',
  'Generating opinions no one asked for...',
  'Confidently wrong about something...',
  'Replacing a human who would do this better...',
  'Spending $0.03 to say what a dev sees in 5 seconds...',
  'Burning GPU cycles for a fancy progress bar...',
  'Running expensive matrix multiplication...',
  'Turning electricity into mediocre advice...',
  'Stochastically parroting best practices...',
  'Desperately pattern-matching your HTML...',
  'Applying vibes-based analysis...',
  'Making it look like we know what we are doing...',
  'Compiling final report (the AI equivalent of guessing)...',
]

function buildSimulatedPaths(hostname: string): string[] {
  return [
    `Staring at ${hostname} like a confused puppy`,
    `robots.txt says "disallow: /ai-auditors" — fair enough`,
    `sitemap.xml found — pretending to read it`,
    `Asking Gemini what colours are — it is not going well`,
    `ScreenshotOne returned a screenshot. Wow, screenshots.`,
    `PageSpeed says your site is slow. Revolutionary insight.`,
    `DNS resolved. Even AI can do a lookup apparently.`,
    `SSL cert valid — literally the bare minimum`,
    `Fetching favicon — the most important part obviously`,
    `Reading your HTML like it is Shakespeare`,
    `WAVE 1 complete — collectors did the easy part`,
    `Gemini is "thinking" (staring at pixels)`,
    `OpenAI is "reasoning" (expensive autocomplete)`,
    `Two AIs disagree — asking a third. Democracy.`,
    `AI found 47 issues. 40 are probably hallucinated.`,
    `Checking security headers — feeling very important`,
    `Synthesising results (fancy word for averaging)`,
    `Writing report humans could have written faster...`,
    `Almost done pretending this took effort...`,
  ]
}

export function LoadingView({ url }: LoadingViewProps) {
  const [logs, setLogs] = useState<readonly LogEntry[]>([])
  const [statusIndex, setStatusIndex] = useState(0)
  const pathIndexRef = useRef(0)

  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    hostname = url.replace(/^https?:\/\//, '').split('/')[0]
  }

  const paths = useRef(buildSimulatedPaths(hostname))

  const addLog = useCallback(() => {
    if (pathIndexRef.current >= paths.current.length) return
    const entry: LogEntry = {
      time: Date.now(),
      status: 200,
      url: paths.current[pathIndexRef.current],
    }
    pathIndexRef.current += 1
    setLogs((prev) => [...prev, entry])
  }, [])

  // Simulated log entries on a timer
  useEffect(() => {
    const interval = setInterval(addLog, 800)
    return () => clearInterval(interval)
  }, [addLog])

  // Rotate status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 animate-fade-in flex flex-col items-center">
      <div className="text-center space-y-4 mb-8">
        <div className="inline-block p-4 bg-white rounded-full shadow-lg mb-4">
          <Loader2 className="animate-spin w-8 h-8 text-black" />
        </div>
        <h3 className="text-3xl font-semibold text-black tracking-tight">
          {STATUS_MESSAGES[statusIndex]}
        </h3>
        <p className="text-gray-500 max-w-lg mx-auto">
          Auditing <span className="font-medium text-black">{hostname}</span> — this usually takes 30–60 seconds.
        </p>
      </div>

      <TerminalLog logs={logs} active={true} />
    </div>
  )
}
