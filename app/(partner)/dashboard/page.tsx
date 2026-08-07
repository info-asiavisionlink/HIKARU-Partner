'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, ChevronRight, Activity, CheckCircle2, Clock, Zap, RotateCcw, Hotel } from 'lucide-react'

const GOLD = 'oklch(0.73 0.12 78)'

function typeLabel(type: string) {
  if (type === 'spot')      return { label: '単発', color: GOLD }
  if (type === 'recurring') return { label: '定期', color: 'oklch(0.85 0.18 198)' }
  if (type === 'hotel')     return { label: 'ホテル', color: 'oklch(0.75 0.15 290)' }
  return { label: type, color: 'oklch(0.55 0.007 75)' }
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = React.useState<any>(null)
  const [projects, setProjects] = React.useState<any[]>([])
  const [totalAssigned, setTotalAssigned] = React.useState(0)
  const [loading, setLoading] = React.useState(true)

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'お疲れ様です'
  const dateStr = now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })

  React.useEffect(() => {
    fetch('/api/home/data', { credentials: 'include', cache: 'no-store' })
      .then(r => { if (r.status === 401) { router.replace('/login'); return null } return r.json() })
      .then(d => { if (!d) return; setProfile(d.profile); setProjects(d.projects ?? []); setTotalAssigned(d.totalAssigned ?? 0) })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-[3px] border-t-transparent animate-spin"
          style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const spotCount      = projects.filter(p => p.project_type === 'spot').length
  const recurringCount = projects.filter(p => p.project_type === 'recurring').length
  const hotelCount     = projects.filter(p => p.project_type === 'hotel').length

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 挨拶ヘッダー */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: `${GOLD}55` }}>
          {dateStr}
        </p>
        <h1 className="mt-1 text-2xl font-bold" style={{ color: 'oklch(0.92 0.008 75)' }}>{greeting}</h1>
        {profile?.partner?.company_name && (
          <p className="text-sm mt-0.5" style={{ color: 'oklch(0.55 0.007 75)' }}>
            {profile.partner.company_name}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <Activity className="h-3 w-3" style={{ color: 'oklch(0.72 0.18 150 / 0.8)' }} />
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'oklch(0.40 0.005 75)' }}>システム正常</span>
          <span className="h-1 w-1 rounded-full animate-pulse" style={{ background: 'oklch(0.72 0.18 150)' }} />
        </div>
      </div>

      {/* 担当案件サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 合計 */}
        <div
          className="col-span-2 md:col-span-1 flex items-center gap-4 rounded-2xl p-4"
          style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: `1px solid ${GOLD}22` }}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
            style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}28` }}>
            <Briefcase className="h-6 w-6" style={{ color: GOLD }} />
          </span>
          <div>
            <p className="text-3xl font-black tabular-nums"
              style={{ background: 'linear-gradient(135deg, oklch(0.62 0.11 75), oklch(0.88 0.13 78))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {totalAssigned}
            </p>
            <p className="text-xs" style={{ color: 'oklch(0.50 0.007 75)' }}>担当案件数</p>
          </div>
        </div>

        {/* 単発 */}
        <div className="rounded-2xl p-4 flex flex-col gap-1"
          style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: `1px solid ${GOLD}14` }}>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: GOLD }} />
            <span className="text-xs" style={{ color: 'oklch(0.55 0.007 75)' }}>単発</span>
          </div>
          <p className="text-2xl font-black tabular-nums" style={{ color: GOLD }}>{spotCount}</p>
        </div>

        {/* 定期 */}
        <div className="rounded-2xl p-4 flex flex-col gap-1"
          style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: '1px solid oklch(0.85 0.18 198 / 0.14)' }}>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" style={{ color: 'oklch(0.85 0.18 198)' }} />
            <span className="text-xs" style={{ color: 'oklch(0.55 0.007 75)' }}>定期</span>
          </div>
          <p className="text-2xl font-black tabular-nums" style={{ color: 'oklch(0.85 0.18 198)' }}>{recurringCount}</p>
        </div>

        {/* ホテル */}
        <div className="rounded-2xl p-4 flex flex-col gap-1"
          style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: '1px solid oklch(0.75 0.15 290 / 0.14)' }}>
          <div className="flex items-center gap-2">
            <Hotel className="h-4 w-4" style={{ color: 'oklch(0.75 0.15 290)' }} />
            <span className="text-xs" style={{ color: 'oklch(0.55 0.007 75)' }}>ホテル</span>
          </div>
          <p className="text-2xl font-black tabular-nums" style={{ color: 'oklch(0.75 0.15 290)' }}>{hotelCount}</p>
        </div>
      </div>

      {/* 最近の案件一覧 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: `${GOLD}50` }}>
            担当案件（直近）
          </p>
          <Link href="/projects" className="text-xs font-medium" style={{ color: GOLD }}>
            すべて見る →
          </Link>
        </div>
        <div className="space-y-2">
          {projects.length === 0 ? (
            <div className="rounded-2xl p-6 text-center"
              style={{ border: `1px dashed ${GOLD}18`, background: 'oklch(0.08 0.004 260 / 0.50)' }}>
              <Briefcase className="mx-auto h-8 w-8 mb-2 opacity-30" style={{ color: GOLD }} />
              <p className="text-sm" style={{ color: 'oklch(0.45 0.006 75)' }}>担当案件がありません</p>
            </div>
          ) : (
            projects.map((p) => {
              const { label: tLabel, color: tColor } = typeLabel(p.project_type ?? '')
              return (
                <Link key={p.id} href={`/projects/${p.id}`}
                  className="flex items-center gap-3 rounded-2xl p-4 transition-all active:scale-[0.98]"
                  style={{ background: 'oklch(0.09 0.005 255 / 0.80)', border: `1px solid ${GOLD}15` }}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                    style={p.status === 'completed'
                      ? { background: 'oklch(0.72 0.18 150 / 0.10)', border: '1px solid oklch(0.72 0.18 150 / 0.35)' }
                      : { background: `${GOLD}10`, border: `1px solid ${GOLD}35` }}>
                    {p.status === 'completed'
                      ? <CheckCircle2 className="h-5 w-5" style={{ color: 'oklch(0.72 0.18 150)' }} />
                      : <Clock className="h-5 w-5" style={{ color: GOLD }} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'oklch(0.90 0.008 75)' }}>{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.location_name && (
                        <p className="text-xs truncate" style={{ color: 'oklch(0.48 0.006 75)' }}>{p.location_name}</p>
                      )}
                      <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: `${tColor}18`, color: tColor }}>
                        {tLabel}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: `${GOLD}45` }} />
                </Link>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
