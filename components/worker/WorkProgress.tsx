import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check, Camera } from 'lucide-react'

const GOLD    = 'oklch(0.73 0.12 78)'
const SUCCESS = 'oklch(0.72 0.18 150)'

interface WorkProgressProps {
  total: number
  completed: number
  label?: string
  className?: string
}

export function WorkProgress({ total, completed, label, className }: WorkProgressProps) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
  const done = percent === 100

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4" style={{ color: 'oklch(0.55 0.007 75)' }} />
          <span className="text-sm font-medium" style={{ color: 'oklch(0.90 0.008 75)' }}>
            {label ?? '撮影進捗'}
          </span>
        </div>
        <span className="text-sm font-semibold" style={{ color: 'oklch(0.90 0.008 75)' }}>
          {completed} / {total}
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full" style={{ background: 'oklch(0.15 0.005 260)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, background: done ? SUCCESS : GOLD }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'oklch(0.55 0.007 75)' }}>
          {done ? '撮影完了' : `残り ${total - completed}件`}
        </span>
        <span
          className="text-xs font-semibold"
          style={{ color: done ? SUCCESS : GOLD }}
        >
          {percent}%
        </span>
      </div>
    </div>
  )
}

interface SpotStatusDotProps {
  hasBefore: boolean
  hasAfter: boolean
  required?: boolean
}

export function SpotStatusDot({ hasBefore, hasAfter, required = true }: SpotStatusDotProps) {
  if (hasAfter) return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full shrink-0" style={{ background: SUCCESS }}>
      <Check className="h-3.5 w-3.5 text-white" />
    </span>
  )
  if (hasBefore) return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full shrink-0" style={{ background: GOLD, color: 'oklch(0.06 0.003 260)' }}>
      <Camera className="h-3.5 w-3.5" />
    </span>
  )
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-full shrink-0"
      style={required
        ? { background: 'oklch(0.60 0.20 25 / 0.15)', border: '1px solid oklch(0.60 0.20 25 / 0.4)' }
        : { background: 'oklch(0.15 0.005 260)', border: '1px solid oklch(0.30 0.005 260)' }
      }
    >
      <Camera
        className="h-3.5 w-3.5"
        style={{ color: required ? 'oklch(0.75 0.20 25)' : 'oklch(0.55 0.007 75)' }}
      />
    </span>
  )
}
