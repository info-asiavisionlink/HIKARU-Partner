'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, ChevronRight, Bell, Activity, CheckCircle2, Clock } from 'lucide-react'

export default function HomePage() {
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
      <div className="min-h-dvh flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-[3px] border-t-transparent animate-spin"
          style={{ borderColor: 'oklch(0.73 0.12 78)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-dvh">
      {/* ヘッダー */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid oklch(0.73 0.12 78 / 0.10)' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: 'oklch(0.73 0.12 78 / 0.55)' }}>
              {dateStr}
            </p>
            <h1 className="mt-1 text-xl font-bold" style={{ color: 'oklch(0.92 0.008 75)' }}>{greeting}</h1>
            {profile?.partner?.company_name && (
              <p className="text-sm mt-0.5" style={{ color: 'oklch(0.55 0.007 75)' }}>
                {profile.partner.company_name}
              </p>
            )}
          </div>
          <Link href="/notifications" className="p-2 rounded-full" style={{ color: 'oklch(0.50 0.007 75)' }}>
            <Bell className="h-5 w-5" />
          </Link>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Activity className="h-3 w-3" style={{ color: 'oklch(0.72 0.18 150 / 0.8)' }} />
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'oklch(0.40 0.005 75)' }}>システム正常</span>
          <span className="h-1 w-1 rounded-full animate-pulse" style={{ background: 'oklch(0.72 0.18 150)' }} />
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* 担当案件数 */}
        <div
          className="flex items-center gap-4 rounded-[var(--radius-xl)] p-4"
          style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: '1px solid oklch(0.73 0.12 78 / 0.22)' }}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
            style={{ background: 'oklch(0.73 0.12 78 / 0.10)', border: '1px solid oklch(0.73 0.12 78 / 0.28)' }}>
            <Briefcase className="h-6 w-6" style={{ color: 'oklch(0.73 0.12 78)' }} />
          </span>
          <div>
            <p className="text-3xl font-black tabular-nums"
              style={{ background: 'linear-gradient(135deg, oklch(0.62 0.11 75), oklch(0.88 0.13 78))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {totalAssigned}
            </p>
            <p className="text-xs" style={{ color: 'oklch(0.50 0.007 75)' }}>担当案件数</p>
          </div>
          <Link href="/jobs" className="ml-auto text-xs font-medium" style={{ color: 'oklch(0.73 0.12 78)' }}>
            すべて見る →
          </Link>
        </div>

        {/* 案件一覧 */}
        <section>
          <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: 'oklch(0.73 0.12 78 / 0.50)' }}>
            担当案件
          </p>
          <div className="space-y-2">
            {projects.length === 0 ? (
              <div className="rounded-[var(--radius-xl)] p-6 text-center"
                style={{ border: '1px dashed oklch(0.73 0.12 78 / 0.18)', background: 'oklch(0.08 0.004 260 / 0.50)' }}>
                <Briefcase className="mx-auto h-8 w-8 mb-2 opacity-30" style={{ color: 'oklch(0.73 0.12 78)' }} />
                <p className="text-sm" style={{ color: 'oklch(0.45 0.006 75)' }}>担当案件がありません</p>
              </div>
            ) : (
              projects.map((p) => (
                <Link key={p.id} href={`/jobs/${p.id}`}
                  className="flex items-center gap-3 rounded-[var(--radius-xl)] p-4 transition-all active:scale-[0.98]"
                  style={{ background: 'oklch(0.09 0.005 255 / 0.80)', border: '1px solid oklch(0.73 0.12 78 / 0.15)' }}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                    style={p.status === 'completed'
                      ? { background: 'oklch(0.72 0.18 150 / 0.10)', border: '1px solid oklch(0.72 0.18 150 / 0.35)' }
                      : { background: 'oklch(0.73 0.12 78 / 0.10)', border: '1px solid oklch(0.73 0.12 78 / 0.35)' }}>
                    {p.status === 'completed'
                      ? <CheckCircle2 className="h-5 w-5" style={{ color: 'oklch(0.72 0.18 150)' }} />
                      : <Clock className="h-5 w-5" style={{ color: 'oklch(0.73 0.12 78)' }} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'oklch(0.90 0.008 75)' }}>{p.name}</p>
                    {p.location_name && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'oklch(0.48 0.006 75)' }}>{p.location_name}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'oklch(0.73 0.12 78 / 0.45)' }} />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
