# Design System — lcaudit

## Principles
- Mobile-first
- Premium, minimal aesthetic (Labcast brand — black/white/gray, Inter font)
- Two layers: simple summary → expandable detail
- No tech jargon in summary layer
- Australian English

## Layout

**Header:** Logo + nav + CTA. Clean, minimal.

**Idle state:** Big headline "Audit your website. Instantly." + URL input with rounded pill style + feature badges.

**Loading state:** Spinner + terminal log with funny messages.

**Results state:**
1. Score rings row (Health Score + Design Index) + Executive Summary card
2. Top 5 Priorities (numbered list)
3. Section cards (collapsed by default) — icon, title, rating badge, ELI5 summary. Click to expand findings.
4. Each finding: severity icon, impact badge, description, evidence quote, recommendation box.

**Error state:** Big error card with retry/reset buttons.

## Tokens

### Spacing & Shape
- `rounded-[32px]` cards with `border-gray-100 shadow-sm`
- `bg-[#f5f5f7]` page background
- Black/white pill buttons with `rounded-full`

### Typography
- `font-sans` (Inter)
- `font-mono` (JetBrains Mono)

### Colour Palette
- `#111111` (black), `#1f1f1f` (dark), `#888888` (medium), `#f5f5f7` (light), `#ffffff` (white)
- Status: `#10b981` (success/green), `#f59e0b` (warning/amber), `#ef4444` (danger/red)

### Components
- Radial bar charts (Recharts) for score display
- Terminal log component (dark bg, traffic light dots, monospace)
- Glass panel effect (`backdrop-filter: blur(20px)`)
- Custom scrollbar (thin, gray, rounded)

### Animation
- Fade-in: `animate-fade-in`, `animate-fade-in-up`
