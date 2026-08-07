'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Phone, ShieldAlert, Clock, Info, Key, Navigation, ArrowLeft, Calendar, Zap, RotateCcw, Hotel } from 'lucide-react'

const GOLD = 'oklch(0.73 0.12 78)'

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: `${GOLD}12` }}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'oklch(0.55 0.007 75)' }} />
      <div>
        <p className="text-xs" style={{ color: 'oklch(0.55 0.007 75)' }}>{label}</p>
        <p className="text-sm mt-0.5" style={{ color: 'oklch(0.90 0.008 75)' }}>{value}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: `1px solid ${GOLD}15` }}>
      <h2 className="text-[9px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: `${GOLD}60` }}>{title}</h2>
      {children}
    </div>
  )
}

function typeInfo(type: string) {
  if (type === 'spot')      return { label: '単発案件',   color: GOLD,                     icon: Zap }
  if (type === 'recurring') return { label: '定期案件',   color: 'oklch(0.85 0.18 198)',   icon: RotateCcw }
  if (type === 'hotel')     return { label: 'ホテル案件', color: 'oklch(0.75 0.15 290)',   icon: Hotel }
  return { label: type, color: 'oklch(0.55 0.007 75)', icon: Zap }
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/projects', { credentials: 'include', cache: 'no-store' })
      .then(r => { if (r.status === 401) { router.replace('/login'); return null } return r.json() })
      .then(d => {
        if (!d) return
        const found = (d.data ?? []).find((p: any) => p.id === id)
        setProject(found ?? null)
      })
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center py-16">
        <p style={{ color: 'oklch(0.50 0.007 75)' }}>案件が見つかりませんでした</p>
        <button onClick={() => router.back()} className="mt-4 text-sm" style={{ color: GOLD }}>戻る</button>
      </div>
    )
  }

  const keysInfo: { model: string; usage: string }[] = project.keys_info ?? []
  const { label: typeLabel, color: typeColor } = typeInfo(project.project_type ?? '')

  const dateRange = [project.start_date, project.end_date].filter(Boolean).join(' 〜 ')
  const timeRange = [project.work_start_time, project.work_end_time].filter(Boolean).join(' 〜 ')

  return (
    <div className="max-w-2xl space-y-4">
      {/* 戻るボタン + タイトル */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="mt-0.5 p-1.5 rounded-lg shrink-0"
          style={{ color: GOLD, background: `${GOLD}10`, border: `1px solid ${GOLD}20` }}
          aria-label="戻る"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight" style={{ color: 'oklch(0.92 0.008 75)' }}>{project.name}</h1>
          {project.code && (
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0.006 75)' }}>{project.code}</p>
          )}
        </div>
      </div>

      {/* ステータス・タイプ */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex text-xs px-3 py-1 rounded-full font-medium"
          style={project.status === 'completed'
            ? { background: 'oklch(0.72 0.18 150 / 0.15)', color: 'oklch(0.72 0.18 150)' }
            : { background: `${GOLD}15`, color: GOLD }}>
          {project.status === 'completed' ? '完了' : '進行中'}
        </span>
        <span className="inline-flex text-xs px-3 py-1 rounded-full font-medium"
          style={{ background: `${typeColor}15`, color: typeColor }}>
          {typeLabel}
        </span>
      </div>

      {/* 期間・時間 */}
      {(dateRange || timeRange) && (
        <Section title="作業期間・時間">
          {dateRange && (
            <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: `${GOLD}12` }}>
              <Calendar className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'oklch(0.55 0.007 75)' }} />
              <div>
                <p className="text-xs" style={{ color: 'oklch(0.55 0.007 75)' }}>作業期間</p>
                <p className="text-sm mt-0.5" style={{ color: 'oklch(0.90 0.008 75)' }}>{dateRange}</p>
              </div>
            </div>
          )}
          {timeRange && (
            <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: `${GOLD}12` }}>
              <Clock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'oklch(0.55 0.007 75)' }} />
              <div>
                <p className="text-xs" style={{ color: 'oklch(0.55 0.007 75)' }}>作業時間</p>
                <p className="text-sm mt-0.5" style={{ color: 'oklch(0.90 0.008 75)' }}>{timeRange}</p>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* 現場情報 */}
      <Section title="現場情報">
        <InfoRow icon={MapPin}      label="作業場所"     value={project.location_name} />
        <InfoRow icon={Phone}       label="電話番号"     value={project.phone} />
        <InfoRow icon={ShieldAlert} label="緊急連絡先"   value={project.emergency_contact} />
        <InfoRow icon={Clock}       label="作業可能時間" value={project.business_hours} />
        <InfoRow icon={Info}        label="注意事項"     value={project.notes} />
      </Section>

      {/* 入館・鍵情報 */}
      {(project.entry_route || project.key_borrowing) && (
        <Section title="入館・鍵情報">
          <InfoRow icon={Navigation} label="入館経路" value={project.entry_route} />
          {project.key_borrowing && (
            <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: `${GOLD}12` }}>
              <Key className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'oklch(0.55 0.007 75)' }} />
              <div>
                <p className="text-xs" style={{ color: 'oklch(0.55 0.007 75)' }}>鍵の借用</p>
                <p className="text-sm mt-0.5" style={{ color: 'oklch(0.90 0.008 75)' }}>あり（{keysInfo.length}本）</p>
                {keysInfo.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {keysInfo.map((k, i) => (
                      <li key={i} className="text-xs" style={{ color: 'oklch(0.65 0.008 75)' }}>
                        {i + 1}. {k.model}{k.usage ? ` (${k.usage})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  )
}
