"use client"

interface ProgressRingProps {
  progress:  number    // 0–100
  size?:     number    // px
  stroke?:   number    // px
  color?:    string
  className?: string
  children?:  React.ReactNode
}

export function ProgressRing({
  progress,
  size    = 48,
  stroke  = 4,
  color   = "#FFD60A",
  className = "",
  children,
}: ProgressRingProps) {
  const radius     = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const filled     = circumference * (1 - (Math.max(0, Math.min(100, progress)) / 100))

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={filled}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}

