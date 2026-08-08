'use client'

import * as React from 'react'
import { Camera, RotateCcw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const GOLD    = 'oklch(0.73 0.12 78)'
const SUCCESS = 'oklch(0.72 0.18 150)'

interface PhotoCaptureProps {
  currentUrl?: string | null
  onCapture: (file: File) => Promise<void>
  onDelete?: () => void
  loading?: boolean
  label?: string
  required?: boolean
}

export function PhotoCapture({
  currentUrl,
  onCapture,
  onDelete,
  loading = false,
  label,
  required = false,
}: PhotoCaptureProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [preview, setPreview] = React.useState<string | null>(currentUrl ?? null)
  const [capturing, setCapturing] = React.useState(false)

  React.useEffect(() => {
    setPreview(currentUrl ?? null)
  }, [currentUrl])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setCapturing(true)
    await onCapture(file)
    setCapturing(false)

    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  function handleRetake() {
    setPreview(null)
    onDelete?.()
    setTimeout(() => inputRef.current?.click(), 50)
  }

  const hasPhoto = !!preview
  const isLoading = loading || capturing

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium" style={{ color: 'oklch(0.90 0.008 75)' }}>
          {label}
          {required && <span className="ml-1" style={{ color: 'oklch(0.60 0.20 25)' }}>*</span>}
        </span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label={`${label ?? '写真'}を撮影`}
      />

      {hasPhoto ? (
        <div
          className="relative overflow-hidden rounded-2xl aspect-[4/3]"
          style={{ background: 'black', border: `1px solid ${GOLD}20` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview!}
            alt="撮影済み写真"
            className="w-full h-full object-cover"
          />
          {/* Overlay actions */}
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={handleRetake}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-1.5 rounded-full',
                'px-3 py-2 text-sm font-medium',
                'active:scale-95 transition-transform',
                'disabled:opacity-50'
              )}
              style={{
                background: 'oklch(0 0 0 / 0.6)',
                backdropFilter: 'blur(8px)',
                color: 'white',
              }}
            >
              <RotateCcw className="h-4 w-4" />
              撮り直す
            </button>
          </div>
          {/* Upload progress indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'oklch(0 0 0 / 0.4)' }}>
              <div
                className="h-8 w-8 rounded-full border-2 animate-spin"
                style={{ borderColor: 'white', borderTopColor: 'transparent' }}
              />
            </div>
          )}
          {/* Done check */}
          {!isLoading && (
            <div className="absolute top-3 right-3">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full shadow"
                style={{ background: SUCCESS }}
              >
                <Check className="h-4 w-4 text-white" />
              </span>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className={cn(
            'flex flex-col items-center justify-center gap-3',
            'w-full aspect-[4/3] rounded-2xl',
            'border-2 border-dashed',
            'transition-all duration-150',
            'active:scale-[0.98]',
            'disabled:opacity-50',
          )}
          style={required
            ? { borderColor: `${GOLD}40`, background: `${GOLD}0a` }
            : { borderColor: 'oklch(0.30 0.005 260)', background: 'oklch(0.09 0.005 255 / 0.5)' }
          }
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={required
              ? { background: GOLD, color: 'oklch(0.06 0.003 260)' }
              : { background: 'oklch(0.20 0.005 260)', color: 'oklch(0.60 0.008 75)' }
            }
          >
            <Camera className="h-7 w-7" />
          </span>
          <span
            className="text-sm font-medium"
            style={required
              ? { color: GOLD }
              : { color: 'oklch(0.60 0.008 75)' }
            }
          >
            タップして撮影
          </span>
        </button>
      )}
    </div>
  )
}
