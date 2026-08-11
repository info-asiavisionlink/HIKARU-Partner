'use client'

import * as React from 'react'
import Link from 'next/link'
import { Search, X, MapPin, ChevronRight, Briefcase, CheckCircle2, Clock } from 'lucide-react'

export default function JobsPage() {
  const [projects, setProjects] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [filter, setFilter] = React.useState<'all' | 'active' | 'completed'>('all')

  React.useEffect(() => {
    fetch('/api/jobs', { credentials: 'include', cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ data }) => setProjects(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = React.useMemo(() => {
    return projects.filter(p => {
      const matchSearch = !search
        || p.name.toLowerCase().includes(search.toLowerCase())
        || (p.location_name ?? '').toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' || p.status === filter
      return matchSearch && matchFilter
    })
  }, [projects, search, filter])

  return (
    <div className="min-h-dvh">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 backdrop-blur-md" style={{ background: 'oklch(0.07 0.004 255 / 0.95)', borderBottom: '1px solid oklch(0.73 0.12 78 / 0.12)' }}>
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-lg font-bold" style={{ color: 'oklch(0.92 0.008 75)' }}>担当案件一覧</h1>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0.007 75)' }}>{projects.length}件</p>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'oklch(0.45 0.006 75)' }} />
            <input
              type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="案件名・作業場所で検索"
              className="h-11 w-full rounded-xl pl-9 pr-9 text-sm outline-none"
              style={{ background: 'oklch(0.10 0.005 255 / 0.80)', border: '1px solid oklch(0.73 0.12 78 / 0.18)', color: 'oklch(0.88 0.008 75)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'oklch(0.45 0.006 75)' }}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-3">
          {(['all', 'active', 'completed'] as const).map(v => (
            <button key={v} onClick={() => setFilter(v)}
              className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all"
              style={filter === v
                ? { background: 'oklch(0.73 0.12 78)', color: 'oklch(0.08 0.005 60)' }
                : { background: 'oklch(0.12 0.007 255 / 0.70)', color: 'oklch(0.55 0.007 75)' }}>
              {v === 'all' ? 'すべて' : v === 'active' ? '進行中' : '完了'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'oklch(0.10 0.005 255 / 0.60)' }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Briefcase className="h-10 w-10 opacity-30 mb-3" style={{ color: 'oklch(0.73 0.12 78)' }} />
            <p className="text-sm" style={{ color: 'oklch(0.50 0.007 75)' }}>案件が見つかりません</p>
          </div>
        ) : (
          filtered.map(p => (
            <Link key={p.id} href={`/jobs/${p.id}`}
              className="flex items-center gap-3 rounded-2xl p-4 transition-all active:scale-[0.98]"
              style={{ background: 'oklch(0.09 0.005 255 / 0.80)', border: `1px solid ${p.status === 'active' ? 'oklch(0.73 0.12 78 / 0.25)' : 'oklch(0.73 0.12 78 / 0.10)'}` }}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
                style={p.status === 'completed'
                  ? { background: 'oklch(0.72 0.18 150 / 0.10)', border: '1px solid oklch(0.72 0.18 150 / 0.35)' }
                  : { background: 'oklch(0.73 0.12 78 / 0.10)', border: '1px solid oklch(0.73 0.12 78 / 0.30)' }}>
                {p.status === 'completed'
                  ? <CheckCircle2 className="h-5 w-5" style={{ color: 'oklch(0.72 0.18 150)' }} />
                  : <Clock className="h-5 w-5" style={{ color: 'oklch(0.73 0.12 78)' }} />}
              </span>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="font-semibold text-sm truncate" style={{ color: 'oklch(0.90 0.008 75)' }}>{p.name}</p>
                {p.location_name && (
                  <p className="flex items-center gap-1 text-xs truncate" style={{ color: 'oklch(0.50 0.007 75)' }}>
                    <MapPin className="h-3 w-3 shrink-0" />{p.location_name}
                  </p>
                )}
                <span className="inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={p.status === 'completed'
                    ? { background: 'oklch(0.72 0.18 150 / 0.12)', color: 'oklch(0.72 0.18 150)' }
                    : { background: 'oklch(0.73 0.12 78 / 0.12)', color: 'oklch(0.73 0.12 78)' }}>
                  {p.status === 'completed' ? '完了' : '進行中'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'oklch(0.73 0.12 78 / 0.45)' }} />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
