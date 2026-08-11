'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { WorkerHeader } from '@/components/layouts/WorkerHeader'
import { cn } from '@/lib/utils'
import {
  FileText, Image as ImageIcon, Video, HelpCircle,
  AlertTriangle, BookOpen, ChevronDown, ChevronUp,
  ExternalLink, Sparkles,
} from 'lucide-react'

const GOLD    = 'oklch(0.73 0.12 78)'
const WARNING = 'oklch(0.75 0.18 60)'

type ManualType = 'pdf' | 'image' | 'video' | 'text' | 'faq' | 'note'

interface Manual {
  id: string
  type: ManualType
  title: string
  content: string | null
  file_url: string | null
  order_num: number
}

const typeConfig: Record<ManualType, { icon: React.ElementType; iconColor: string; bg: string; label: string }> = {
  text:  { icon: FileText,      iconColor: 'oklch(0.75 0.008 75)', bg: 'oklch(0.15 0.005 260)',  label: '文章' },
  faq:   { icon: HelpCircle,    iconColor: 'oklch(0.75 0.15 240)', bg: 'oklch(0.75 0.15 240 / 0.15)', label: 'FAQ' },
  note:  { icon: AlertTriangle, iconColor: WARNING,                 bg: `${WARNING}15`,             label: '注意事項' },
  pdf:   { icon: FileText,      iconColor: GOLD,                    bg: `${GOLD}15`,                label: 'PDF' },
  image: { icon: ImageIcon,     iconColor: 'oklch(0.72 0.18 150)',  bg: 'oklch(0.72 0.18 150 / 0.15)', label: '画像' },
  video: { icon: Video,         iconColor: 'oklch(0.65 0.20 25)',   bg: 'oklch(0.65 0.20 25 / 0.15)', label: '動画' },
}

function ManualCard({ manual }: { manual: Manual }) {
  const [open, setOpen] = React.useState(manual.type === 'note')
  const config = typeConfig[manual.type]
  const Icon = config.icon

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={manual.type === 'note'
        ? { background: `${WARNING}0a`, border: `1px solid ${WARNING}40` }
        : { background: 'oklch(0.09 0.005 255 / 0.82)', border: `1px solid ${GOLD}15` }
      }
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
          style={{ background: config.bg, color: config.iconColor }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'oklch(0.92 0.008 75)' }}>{manual.title}</p>
          <p className="text-xs" style={{ color: 'oklch(0.55 0.007 75)' }}>{config.label}</p>
        </div>
        {open
          ? <ChevronUp   className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
          : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
        }
      </button>

      {open && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${GOLD}10` }}>
          {manual.content && (
            <p className="mt-3 text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'oklch(0.90 0.008 75)' }}>
              {manual.content}
            </p>
          )}
          {manual.type === 'pdf' && manual.file_url && (
            <a
              href={manual.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: `${GOLD}12`, color: GOLD }}
            >
              <FileText className="h-4 w-4 shrink-0" />
              PDFを開く
              <ExternalLink className="h-3.5 w-3.5 ml-auto" />
            </a>
          )}
          {manual.type === 'image' && manual.file_url && (
            <div className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={manual.file_url} alt={manual.title} className="w-full rounded-xl object-contain max-h-64" />
            </div>
          )}
          {manual.type === 'video' && manual.file_url && (
            <div className="mt-3">
              <video src={manual.file_url} controls playsInline className="w-full rounded-xl" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ManualPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [manuals, setManuals]       = React.useState<Manual[]>([])
  const [projectName, setProjectName] = React.useState('')
  const [loading, setLoading]       = React.useState(true)
  const [filter, setFilter]         = React.useState<ManualType | 'all'>('all')

  React.useEffect(() => {
    async function load() {
      const res = await fetch(`/api/projects/${projectId}/manuals`, { credentials: 'include', cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        setManuals(j.data ?? [])
        setProjectName(j.projectName ?? '')
      }
      setLoading(false)
    }
    load()
  }, [projectId])

  const types    = React.useMemo(() => Array.from(new Set(manuals.map((m) => m.type))), [manuals])
  const filtered = filter === 'all' ? manuals : manuals.filter((m) => m.type === filter)
  const notes    = filtered.filter((m) => m.type === 'note')
  const others   = filtered.filter((m) => m.type !== 'note')

  return (
    <div>
      <WorkerHeader
        title="マニュアル"
        showBack
        rightAction={
          <Link
            href={`/projects/${projectId}/chat`}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: GOLD, color: 'oklch(0.06 0.003 260)' }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">AIに質問</span>
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <>
          {/* AIチャットバナー */}
          <Link href={`/projects/${projectId}/chat`}>
            <div
              className="mx-4 mt-4 flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-transform active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${GOLD}, oklch(0.55 0.15 290))`, boxShadow: `0 8px 24px ${GOLD}30` }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
                style={{ background: 'oklch(1 0 0 / 0.2)' }}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'oklch(0.06 0.003 260)' }}>AIアシスタントに質問する</p>
                <p className="text-xs mt-0.5" style={{ color: 'oklch(0.06 0.003 260 / 0.8)' }}>このマニュアルを参照して回答します</p>
              </div>
            </div>
          </Link>

          {projectName && (
            <div className="px-4 mt-3 flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 shrink-0" style={{ color: 'oklch(0.55 0.007 75)' }} />
              <span className="text-xs truncate" style={{ color: 'oklch(0.55 0.007 75)' }}>{projectName} のマニュアル</span>
            </div>
          )}

          {manuals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <BookOpen className="h-12 w-12 mb-3" style={{ color: 'oklch(0.40 0.006 75)' }} />
              <p className="text-sm font-medium" style={{ color: 'oklch(0.90 0.008 75)' }}>マニュアルがありません</p>
              <p className="mt-1 text-xs" style={{ color: 'oklch(0.55 0.007 75)' }}>管理者がマニュアルを登録すると表示されます</p>
            </div>
          ) : (
            <>
              {types.length > 1 && (
                <div className="flex gap-1.5 px-4 py-3 mt-3 overflow-x-auto">
                  <button
                    onClick={() => setFilter('all')}
                    className={cn(
                      'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                    )}
                    style={filter === 'all'
                      ? { background: GOLD, color: 'oklch(0.06 0.003 260)' }
                      : { background: 'oklch(0.15 0.005 260)', color: 'oklch(0.75 0.008 75)' }
                    }
                  >
                    すべて ({manuals.length})
                  </button>
                  {types.map((t) => {
                    const cfg = typeConfig[t]
                    return (
                      <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
                        style={filter === t
                          ? { background: GOLD, color: 'oklch(0.06 0.003 260)' }
                          : { background: 'oklch(0.15 0.005 260)', color: 'oklch(0.75 0.008 75)' }
                        }
                      >
                        {cfg.label} ({manuals.filter((m) => m.type === t).length})
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="px-4 py-4 space-y-3 pb-8">
                {notes.map((m) => <ManualCard key={m.id} manual={m} />)}
                {others.map((m) => <ManualCard key={m.id} manual={m} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
