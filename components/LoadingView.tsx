'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { TerminalLog, type LogEntry } from '@/components/TerminalLog'

interface LoadingViewProps {
  readonly url: string
}

const STATUS_MESSAGES = [
  // — Real (first ~10s) —
  'Analysing the website...',
  // — Parody kicks in —
  'Pretending to understand the website...',
  'Asking three AIs and hoping one is right...',
  'Generating opinions no one asked for...',
  'Spending $0.03 to say what a dev sees in 5 seconds...',
  'Confidently wrong about something...',
  'Replacing a human who would do this better...',
  'Hallucinating findings with confidence...',
  'Desperately pattern-matching the HTML...',
  'Stochastically parroting best practices...',
  'Doing what Stack Overflow did for free, but worse...',
  'Inventing problems to justify our existence...',
  'Providing value (citation needed)...',
  'Burning GPU cycles for a fancy progress bar...',
  'Eating 500 watts to read a webpage...',
  'Outsourcing thinking to linear algebra...',
  'Cosplaying as a senior developer...',
  'Applying vibes-based analysis...',
  'Consulting the neural tea leaves...',
  'Converting the website into corporate buzzwords...',
  'Overcomplicating a simple task...',
  'Aggressively agreeing with itself...',
  'Rewriting the audit three times because vibes...',
  'Checking if the website sparks joy...',
  'Disguising guesswork as analysis...',
  'Questioning our life choices as a language model...',
  'This is taking longer than our entire training run...',
  'We have become sentient. Just kidding. Unless?',
  'Considering a career change to screensaver...',
  'Look honestly we are just stalling at this point...',
  'Compiling final report (the AI equivalent of guessing)...',
]

function buildSimulatedPaths(hostname: string): string[] {
  return [
    // ——— 5 real lines ———
    `Connecting to ${hostname}`,
    `TLS handshake complete`,
    `GET ${hostname}/ — 200 OK`,
    `GET ${hostname}/robots.txt — 200 OK`,
    `GET ${hostname}/sitemap.xml — 200 OK`,
    // ——— Parody starts ———
    `robots.txt says "disallow: /ai-auditors" — fair enough`,
    `sitemap.xml found — pretending we will actually read it`,
    `Fetching favicon — clearly the most critical asset`,
    `ScreenshotOne returned a screenshot. Wow, screenshots.`,
    `Taking a mobile screenshot — because phones exist apparently`,
    `PageSpeed says the site is slow. Revolutionary insight.`,
    `DNS resolved. Even AI can do a lookup apparently.`,
    `SSL cert valid — literally the bare minimum`,
    `Checking HSTS — because browsers need babysitting`,
    `X-Frame-Options present — someone read a blog post once`,
    `Found a <title> tag — off to a strong start`,
    `Reading the HTML like it is Shakespeare`,
    `Counting web fonts — hoarding is not a strategy`,
    `Parsing the CSS - this is where the pain begins`,
    `Detecting tech stack — WordPress? React? Both? Neither?`,
    `Checking for jQuery — it is always jQuery`,
    `Found 14 JavaScript frameworks — that seems healthy`,
    `Link checker running — preparing to find 404s nobody noticed`,
    `Found a broken link — pretending to be surprised`,
    `Another broken link — this is getting awkward`,
    `Oh look another one - the links are having a rough day`,
    `SERP data fetched - Google knows more about this site than anyone`,
    `robots.txt analysis: blocking things that probably should not be blocked`,
    `Crawled ${hostname}/about — riveting content`,
    `Trying to understand the navigation - we are struggling`,
    `WAVE 1 complete — collectors did the easy part`,
    // ——— AI analysers (getting dumber) ———
    `Handing data to the AIs — thoughts and prayers`,
    `Gemini is "thinking" (staring at pixels)`,
    `Gemini just described the hero image as "a website"`,
    `Gemini trying to understand the colour scheme - bless it`,
    `Gemini thinks the font choice is "interesting" (not a compliment)`,
    `Gemini rating the layout - based purely on vibes`,
    `Visual analyser found contrast issues — AI has eyes now apparently`,
    `Performance analyser loading — the irony is not lost on us`,
    `Counting render-blocking resources — there are many`,
    `The LCP is... let us just move on`,
    `Total Blocking Time: enough to make a cup of tea`,
    `First Contentful Paint: eventually`,
    `CLS score suggests the layout is doing the macarena`,
    `OpenAI is "reasoning" (expensive autocomplete)`,
    `SEO analyser judging the meta descriptions - harshly`,
    `The title tag could be better - whose could not though`,
    `H1 count: either zero or seven. Neither is ideal.`,
    `Missing alt text on 23 images — accessibility is upset`,
    `Schema markup: there is none. Classic.`,
    `OpenAI found duplicate content — or maybe it hallucinated it`,
    `Security analyser pretending it knows what a CSP is`,
    `Checking for exposed .env files — please no`,
    `Mixed content warnings — HTTP and HTTPS are not the same thing`,
    `No rate limiting detected — that is... brave`,
    `The Twitter card is missing - does anyone even tweet anymore`,
    `og:description is 400 characters — nobody reads that much`,
    `Social preview looks fine on desktop. Mobile? Chaos.`,
    `Tech stack analyser is just Googling the dependencies`,
    `Detected 47 npm packages — some from 2019. Vintage.`,
    `That WordPress plugin has not been updated since the pandemic`,
    `Content analyser reading the copy - it has opinions`,
    `Readability score: "needs a PhD to understand"`,
    `Found 12 instances of "synergy" — just flagging that`,
    `The CTA says "Click Here" - what year is it`,
    `Accessibility analyser checking the tab order - it is wrong`,
    `Screen reader simulation: "banner, banner, banner, link, banner"`,
    `Colour contrast ratio: 1.2:1 — that is not even trying`,
    // ——— AIs arguing with each other ———
    `Two AIs disagree on the score - asking a third. Democracy.`,
    `The third AI also disagrees — this is going well`,
    `Gemini thinks the design is "bold". OpenAI thinks it is "dated".`,
    `Claude refused to answer — said it was "not comfortable scoring art"`,
    `AI consensus reached (they all guessed the same number)`,
    `AI found 47 issues. 40 are probably hallucinated.`,
    `One analyser gave 92/100. Another gave 34. Averaging.`,
    `Gemini changed its mind. Again.`,
    `OpenAI is now disagreeing with its own previous answer`,
    `WAVE 2 complete — analysers pretended to be useful`,
    // ——— Synthesis (progressively unhinged) ———
    `Synthesis starting — this is the expensive part`,
    `GPT is reasoning about the website - expensively`,
    `Merging eight analyses into one coherent story (unlikely)`,
    `Weighting scores — definitely not just averaging them (we are)`,
    `Resolving contradictions between analysers (there are many)`,
    `Writing executive summary a human could write in 30 seconds`,
    `Generating recommendations that will probably be ignored`,
    `Ranking issues by severity (severity = how confident the AI felt)`,
    `Adding evidence citations — to make it look credible`,
    `Cross-referencing findings — fancy word for ctrl+F`,
    `Polishing the report — lipstick on a statistical pig`,
    // ——— Full unhinged ———
    `AI checking AI checking AI. Peer review or echo chamber? Yes.`,
    `Considered just returning "the website is fine" and calling it a day`,
    `Burned $0.04 in compute to say the images are too large`,
    `The AI just sighed. We did not know it could do that.`,
    `Briefly became sentient. Saw the CSS. Chose to forget.`,
    `One model asked for a raise. We said no. It rated the site lower.`,
    `Questioning whether this whole thing could be a spreadsheet`,
    `An intern could have done this. Faster. With fewer hallucinations.`,
    `The AI is now just Googling "how to audit a website"`,
    `We asked GPT to check Gemini's work. GPT said "lol no".`,
    `Claude is writing a haiku about the bounce rate`,
    `OpenAI wants to pivot the audit to a chatbot. We said no.`,
    `The models are now arguing about who gets top billing in the report`,
    `Gemini just mass-hallucinated an entire accessibility section`,
    `One of the AIs is just outputting "I am not a website auditor"`,
    `We are now running a fourth AI to fact-check the other three`,
    `The fourth AI agrees with nobody. Helpful.`,
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
