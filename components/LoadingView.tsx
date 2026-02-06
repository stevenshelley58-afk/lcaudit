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
  'Cosplaying as a senior developer...',
  'Converting your website into corporate buzzwords...',
  'Doing what Stack Overflow did for free, but worse...',
  'Inventing problems to justify our existence...',
  'Aggressively agreeing with itself...',
  'Overcomplicating a simple task...',
  'Providing value (citation needed)...',
  'Eating 500 watts to read a webpage...',
  'Rewriting your audit three times because vibes...',
  'Checking if your website sparks joy...',
  'Outsourcing thinking to linear algebra...',
  'Statistically likely to be almost correct...',
  'Averaging two wrong answers to get a right one...',
  'Consulting the neural tea leaves...',
  'Disguising guesswork as analysis...',
  'Compiling final report (the AI equivalent of guessing)...',
]

function buildSimulatedPaths(hostname: string): string[] {
  return [
    // — WAVE 1: Collectors —
    `Staring at ${hostname} like a confused puppy`,
    `Establishing connection — the one thing we are good at`,
    `robots.txt says "disallow: /ai-auditors" — fair enough`,
    `sitemap.xml found — pretending we will actually read it`,
    `Fetching favicon — clearly the most critical asset`,
    `Asking ScreenshotOne to do the seeing for us`,
    `ScreenshotOne returned a screenshot. Wow, screenshots.`,
    `Taking a mobile screenshot — because phones exist apparently`,
    `PageSpeed API pinged — Google judging your site now`,
    `PageSpeed says your site is slow. Revolutionary insight.`,
    `DNS resolved. Even AI can do a lookup apparently.`,
    `SSL cert valid — literally the bare minimum`,
    `Checking SSL expiry — maths AI can actually do`,
    `Reading your HTML like it is Shakespeare`,
    `Extracting meta tags — the part humans skip too`,
    `Found a <title> tag — off to a strong start`,
    `Checking og:image — social cards matter apparently`,
    `Scanning security headers — feeling very important right now`,
    `X-Frame-Options found — someone read a blog post once`,
    `Checking HSTS — because browsers need babysitting`,
    `Parsing your CSS — this is where the pain begins`,
    `Counting your fonts — hoarding is not a strategy`,
    `Detecting tech stack — WordPress? React? Both? Neither?`,
    `Found 14 JavaScript frameworks — that seems healthy`,
    `Checking for jQuery — it is always jQuery`,
    `Link checker running — preparing to find 404s nobody noticed`,
    `Found a broken link — pretending to be surprised`,
    `Another broken link — this is getting awkward`,
    `SERP data fetched — Google knows more about your site than you do`,
    `robots.txt analysis: you are blocking things you probably should not`,
    `Crawled ${hostname}/about — riveting content`,
    `Trying to understand your navigation — we are struggling`,
    `WAVE 1 complete — collectors did the easy part`,
    // — WAVE 2: AI Analysers —
    `Handing data to the AIs — thoughts and prayers`,
    `Gemini is "thinking" (staring at pixels)`,
    `Gemini just described your hero image as "a website"`,
    `Gemini trying to understand your colour scheme — bless it`,
    `Gemini thinks your font choice is "interesting" (not a compliment)`,
    `Visual analyser found contrast issues — AI has eyes now apparently`,
    `Gemini rating your layout — based purely on vibes`,
    `Performance analyser loading — the irony is not lost on us`,
    `Counting render-blocking resources — there are many`,
    `Your LCP is... let us just move on`,
    `CLS score calculated — things are shifting around more than they should`,
    `Total Blocking Time: enough to make a cup of tea`,
    `OpenAI is "reasoning" (expensive autocomplete)`,
    `SEO analyser judging your meta descriptions — harshly`,
    `Your title tag could be better — whose could not though`,
    `H1 count: either zero or seven. Neither is ideal.`,
    `Missing alt text on 23 images — accessibility called, they are upset`,
    `Schema markup analysis: you have none. Classic.`,
    `OpenAI found duplicate content — or maybe it hallucinated it`,
    `Security analyser pretending it knows what a CSP is`,
    `Checking for exposed .env files — please no`,
    `Mixed content warnings — HTTP and HTTPS are not the same thing`,
    `No rate limiting detected — that is... brave`,
    `Social preview analyser loading your og:tags`,
    `Your Twitter card is missing — do you even tweet`,
    `og:description is 400 characters — nobody reads that much`,
    `Social preview looks fine on desktop. Mobile? Chaos.`,
    `Tech stack analyser is Googling your dependencies`,
    `Detected 47 npm packages — some from 2019. Vintage.`,
    `That WordPress plugin has not been updated since the pandemic`,
    `Content analyser reading your copy — it has opinions`,
    `Readability score: "needs a PhD to understand"`,
    `Found 12 instances of "synergy" — just flagging that`,
    `Your CTA says "Click Here" — what year is it`,
    `Accessibility analyser checking your tab order — it is wrong`,
    `Screen reader simulation: "banner, banner, banner, link, banner"`,
    `Colour contrast ratio: 1.2:1 — that is not even trying`,
    `Two AIs disagree on your score — asking a third. Democracy.`,
    `The third AI also disagrees — this is going well`,
    `AI consensus reached (they all guessed the same number)`,
    `AI found 47 issues. 40 are probably hallucinated.`,
    `WAVE 2 complete — analysers pretended to be useful`,
    // — WAVE 3: Synthesis —
    `Synthesis starting — this is the expensive part`,
    `GPT-5 is reasoning about your website — expensively`,
    `Merging eight analyses into one coherent story (unlikely)`,
    `Weighting scores — definitely not just averaging them`,
    `Resolving contradictions between analysers (there are many)`,
    `Writing executive summary humans could have written faster`,
    `Generating recommendations you will probably ignore`,
    `Formatting findings — making guesswork look professional`,
    `Ranking issues by severity (severity = how confident the AI felt)`,
    `Adding evidence citations — to make it look credible`,
    `Cross-referencing findings — fancy word for ctrl+F`,
    `Polishing the report — lipstick on a statistical pig`,
    `Final quality check — AI checking AI. What could go wrong.`,
    `Almost done pretending this took effort...`,
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
