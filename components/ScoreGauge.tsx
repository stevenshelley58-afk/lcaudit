'use client'

interface ScoreGaugeProps {
  readonly score: number
  readonly size?: number
  readonly label?: string
}

export function ScoreGauge({ score, size = 100, label }: ScoreGaugeProps) {
  const radius = (size / 100) * 40
  const strokeWidth = (size / 100) * 6
  const viewBox = `0 0 ${size} ${size}`
  const centre = size / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const colour =
    score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger'

  const fontSize = size >= 80 ? 'text-2xl' : 'text-sm'

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} viewBox={viewBox}>
          <circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200"
          />
          <circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={colour}
            transform={`rotate(-90 ${centre} ${centre})`}
          />
        </svg>
        <span className={`absolute ${fontSize} font-bold text-black`}>
          {score}
        </span>
      </div>
      {label && (
        <span className="text-xs text-medium text-center leading-tight">
          {label}
        </span>
      )}
    </div>
  )
}
