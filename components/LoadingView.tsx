'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { TerminalLog, type LogEntry } from '@/components/TerminalLog'

interface LoadingViewProps {
  readonly url: string
}

const STATUS_MESSAGES = [
  'Capturing screenshots...',
  'Running PageSpeed analysis...',
  'Extracting HTML metadata...',
  'Checking robots.txt & sitemap...',
  'Inspecting SSL & DNS...',
  'Scanning security headers...',
  'Analysing design & UX...',
  'Evaluating performance metrics...',
  'Reviewing SEO signals...',
  'Checking accessibility...',
  'Assessing security posture...',
  'Inspecting social previews...',
  'Detecting tech stack...',
  'Reviewing content quality...',
  'Compiling final report...',
]

function buildSimulatedPaths(hostname: string): string[] {
  return [
    `https://${hostname}/`,
    `https://${hostname}/robots.txt`,
    `https://${hostname}/sitemap.xml`,
    `https://${hostname}/favicon.ico`,
    `ScreenshotOne API → desktop capture`,
    `ScreenshotOne API → mobile capture`,
    `PageSpeed Insights API → ${hostname}`,
    `DNS lookup → ${hostname}`,
    `SSL certificate → ${hostname}`,
    `https://${hostname}/`,
    `WAVE 1 collectors complete`,
    `Gemini → visual analyser`,
    `Gemini → performance analyser`,
    `OpenAI → SEO analyser`,
    `Gemini → accessibility analyser`,
    `OpenAI → security analyser`,
    `OpenAI → social analyser`,
    `OpenAI → tech-stack analyser`,
    `Gemini → content analyser`,
    `WAVE 2 analysers complete`,
    `GPT-5 → synthesis`,
    `Building final report...`,
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
