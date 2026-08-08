'use client'

import * as React from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { TOAST_EVENT, type ToastPayload, type ToastKind } from '@/lib/toast'

const GOLD = 'oklch(0.73 0.12 78)'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

const KIND_STYLE: Record<ToastKind, { bg: string; border: string; color: string; Icon: React.ElementType }> = {
  success: {
    bg:     'oklch(0.72 0.18 150 / 0.15)',
    border: 'oklch(0.72 0.18 150 / 0.45)',
    color:  'oklch(0.90 0.15 150)',
    Icon:   CheckCircle2,
  },
  error: {
    bg:     'oklch(0.60 0.20 25 / 0.15)',
    border: 'oklch(0.60 0.20 25 / 0.45)',
    color:  'oklch(0.85 0.20 25)',
    Icon:   XCircle,
  },
  info: {
    bg:     `${GOLD}12`,
    border: `${GOLD}40`,
    color:  GOLD,
    Icon:   Info,
  },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const nextId = React.useRef(1)

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  React.useEffect(() => {
    function handle(e: Event) {
      const ce = e as CustomEvent<ToastPayload>
      const { kind, message } = ce.detail
      const id = nextId.current++
      setItems((prev) => [...prev, { id, kind, message }])
      // Auto dismiss
      setTimeout(() => remove(id), 3500)
    }
    window.addEventListener(TOAST_EVENT, handle)
    return () => window.removeEventListener(TOAST_EVENT, handle)
  }, [remove])

  return (
    <>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {items.map((t) => {
          const s = KIND_STYLE[t.kind]
          const Icon = s.Icon
          return (
            <div
              key={t.id}
              role="status"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minWidth: '260px',
                maxWidth: '400px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'oklch(0.09 0.005 255 / 0.95)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${s.border}`,
                color: 'oklch(0.92 0.008 75)',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: `0 10px 40px oklch(0 0 0 / 0.5), 0 0 20px ${s.border}`,
                animation: 'toast-in 0.25s ease-out',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '999px',
                  background: s.bg,
                  color: s.color,
                  flexShrink: 0,
                }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                aria-label="閉じる"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'oklch(0.55 0.007 75)',
                  padding: '2px',
                  flexShrink: 0,
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </>
  )
}
