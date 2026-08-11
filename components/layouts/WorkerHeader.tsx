'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface Props {
  title: string
  showBack?: boolean
  rightAction?: React.ReactNode
}

export function WorkerHeader({ title, showBack, rightAction }: Props) {
  const router = useRouter()
  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center gap-3 px-4"
      style={{
        background: 'oklch(0.07 0.004 255 / 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid oklch(0.73 0.12 78 / 0.12)',
      }}
    >
      {showBack && (
        <button onClick={() => router.back()} className="p-1.5 rounded-lg" style={{ color: 'oklch(0.73 0.12 78)' }}>
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="flex-1 text-base font-bold truncate" style={{ color: 'oklch(0.92 0.008 75)' }}>
        {title}
      </h1>
      {rightAction}
    </header>
  )
}
