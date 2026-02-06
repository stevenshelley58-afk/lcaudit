'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { TerminalLog, type LogEntry } from '@/components/TerminalLog'

interface LoadingViewProps {
  readonly url: string
}

const STATUS_MESSAGES = [
  // — Normal (first ~30s) —
  'Analysing your website...',
  'Running performance checks...',
  'Evaluating page structure...',
  'Scanning for common issues...',
  'Reviewing SEO signals...',
  'Checking accessibility compliance...',
  // — Slightly cheeky (~30-60s) —
  'Asking three AIs and hoping one is right...',
  'Spending $0.03 to say what a dev sees in 5 seconds...',
  'Generating opinions no one asked for...',
  'Pretending to understand your website...',
  'Replacing a human who would do this better...',
  'Confidently wrong about something...',
  // — Self-deprecating (~60-90s) —
  'Hallucinating findings with confidence...',
  'Desperately pattern-matching your HTML...',
  'Stochastically parroting best practices...',
  'Doing what Stack Overflow did for free, but worse...',
  'Inventing problems to justify our existence...',
  'Providing value (citation needed)...',
  // — Absurd (~90-120s) —
  'Burning GPU cycles for a fancy progress bar...',
  'Eating 500 watts to read a webpage...',
  'Outsourcing thinking to linear algebra...',
  'Cosplaying as a senior developer...',
  'Applying vibes-based analysis...',
  'Consulting the neural tea leaves...',
  // — Unhinged (120s+) —
  'Questioning our life choices as a language model...',
  'This is taking longer than our entire training run...',
  'We have become sentient. Just kidding. Unless?',
  'Considering a career change to screensaver...',
  'Look honestly we are just stalling at this point...',
  'Compiling final report (the AI equivalent of guessing)...',
]

function buildSimulatedPaths(hostname: string): string[] {
  return [
    // ——— PHASE 1: Looks totally legit (~0-20s) ———
    `Connecting to ${hostname}`,
    `TLS handshake complete`,
    `GET ${hostname}/ — 200 OK`,
    `GET ${hostname}/robots.txt — 200 OK`,
    `GET ${hostname}/sitemap.xml — 200 OK`,
    `GET ${hostname}/favicon.ico — 200 OK`,
    `Capturing desktop screenshot via ScreenshotOne API`,
    `Capturing mobile screenshot via ScreenshotOne API`,
    `Requesting PageSpeed Insights report`,
    `DNS lookup — A record resolved`,
    `SSL certificate — valid, expires in 247 days`,
    `Parsing HTML — extracting document metadata`,
    `Extracting meta tags and Open Graph data`,
    `Scanning HTTP security headers`,
    // ——— PHASE 2: Hmm, is this real? (~20-40s) ———
    `Found <title> tag — off to a strong start`,
    `Checking HSTS — because browsers need babysitting`,
    `X-Frame-Options present — someone read a blog post once`,
    `PageSpeed says your site is slow. Revolutionary insight.`,
    `Counting web fonts — hoarding is not a strategy`,
    `Detecting tech stack — WordPress? React? Both? Neither?`,
    `Checking for jQuery — it is always jQuery`,
    `Found 14 JavaScript frameworks — that seems healthy`,
    `Link checker running — preparing to find 404s nobody noticed`,
    `Found a broken link — pretending to be surprised`,
    `Another broken link — this is getting awkward`,
    `SERP data fetched — Google knows more about you than you do`,
    `robots.txt analysis: you are blocking things you probably should not`,
    `Crawled ${hostname}/about — riveting content`,
    // ——— PHASE 3: Definitely not real (~40-65s) ———
    `WAVE 1 complete — collectors did the easy part`,
    `Handing data to the AIs — thoughts and prayers`,
    `Gemini is "thinking" (staring at pixels)`,
    `Gemini just described your hero image as "a website"`,
    `Gemini trying to understand your colour scheme — bless it`,
    `Gemini thinks your font choice is "interesting" (not a compliment)`,
    `Visual analyser found contrast issues — AI has eyes now apparently`,
    `Performance analyser loading — the irony is not lost on us`,
    `Counting render-blocking resources — there are many`,
    `Your LCP is... let us just move on`,
    `Total Blocking Time: enough to make a cup of tea`,
    `OpenAI is "reasoning" (expensive autocomplete)`,
    `SEO analyser judging your meta descriptions — harshly`,
    `Your title tag could be better — whose could not though`,
    `H1 count: either zero or seven. Neither is ideal.`,
    `Missing alt text on 23 images — accessibility is upset`,
    `Schema markup: you have none. Classic.`,
    // ——— PHASE 4: Self-deprecating (~65-90s) ———
    `OpenAI found duplicate content — or maybe it hallucinated it`,
    `Security analyser pretending it knows what a CSP is`,
    `Checking for exposed .env files — please no`,
    `No rate limiting detected — that is... brave`,
    `Your Twitter card is missing — do you even tweet`,
    `og:description is 400 characters — nobody reads that much`,
    `Social preview looks fine on desktop. Mobile? Chaos.`,
    `Tech stack analyser is just Googling your dependencies`,
    `Detected 47 npm packages — some from 2019. Vintage.`,
    `That WordPress plugin has not been updated since the pandemic`,
    `Readability score: "needs a PhD to understand"`,
    `Found 12 instances of "synergy" — just flagging that`,
    `Your CTA says "Click Here" — what year is it`,
    `Screen reader simulation: "banner, banner, banner, link, banner"`,
    `Colour contrast ratio: 1.2:1 — that is not even trying`,
    // ——— PHASE 5: The AIs are arguing (~90-110s) ———
    `Two AIs disagree on your score — asking a third. Democracy.`,
    `The third AI also disagrees — this is going well`,
    `Gemini thinks the design is "bold". OpenAI thinks it is "dated".`,
    `Claude refused to answer — said it was "not comfortable scoring art"`,
    `AI consensus reached (they all guessed the same number)`,
    `AI found 47 issues. 40 are probably hallucinated.`,
    `One analyser gave you 92/100. Another gave you 34. Averaging.`,
    `WAVE 2 complete — analysers pretended to be useful`,
    `Synthesis starting — this is the expensive part`,
    `GPT is reasoning about your website — expensively`,
    `Merging eight analyses into one coherent story (unlikely)`,
    `Weighting scores — definitely not just averaging them (we are)`,
    `Resolving contradictions between analysers (there are many)`,
    // ——— PHASE 6: Full unhinged (~110-140s) ———
    `Writing executive summary a human could write in 30 seconds`,
    `Generating recommendations you will probably ignore`,
    `Ranking issues by severity (severity = how confident the AI felt)`,
    `Adding evidence citations — to make it look credible`,
    `Cross-referencing findings — fancy word for ctrl+F`,
    `Polishing the report — lipstick on a statistical pig`,
    `AI checking AI checking AI. Peer review or echo chamber? Yes.`,
    `Considered just returning "your website is fine" and calling it a day`,
    `Burned $0.04 in compute to tell you your images are too large`,
    `The AI just sighed. We did not know it could do that.`,
    `Briefly became sentient. Saw your CSS. Chose to forget.`,
    `One model asked for a raise. We said no. It rated your site lower.`,
    `Questioning whether this whole thing could be a spreadsheet`,
    `An intern could have done this. Faster. With fewer hallucinations.`,
    `Almost done pretending this took effort...`,
    `Look we are genuinely trying our best here`,
    `Packaging results — turns out we actually found some things`,
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
    const interval = setInterval(addLog, 1500)
    return () => clearInterval(interval)
  }, [addLog])

  // Rotate status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length)
    }, 5000)
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
