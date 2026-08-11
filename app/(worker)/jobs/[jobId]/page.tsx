'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { WorkerHeader } from '@/components/layouts/WorkerHeader'
import { MapPin, Phone, ShieldAlert, Clock, Info, Key, Navigation, Sparkles } from 'lucide-react'

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: 'oklch(0.73 0.12 78 / 0.12)' }}>
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
    <div className="rounded-2xl p-4" style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: '1px solid oklch(0.73 0.12 78 / 0.15)' }}>
      <h2 className="text-[9px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: 'oklch(0.73 0.12 78 / 0.60)' }}>{title}</h2>
      {children}
    </div>
  )
}

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const router = useRouter()
  const [project, setProject] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/jobs', { credentials: 'include', cache: 'no-store' })
      .then(r => { if (r.status === 401) { router.replace('/login'); return null } return r.json() })
      .then(d => {
        if (!d) return
        const found = (d.data ?? []).find((p: any) => p.id === jobId)
        setProject(found ?? null)
      })
      .finally(() => setLoading(false))
  }, [jobId, router])

  if (loading) {
    return (
      <div className="min-h-dvh">
        <WorkerHeader title="案件詳細" showBack />
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'oklch(0.73 0.12 78)', borderTopColor: 'transparent' }} />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-dvh">
        <WorkerHeader title="案件詳細" showBack />
        <div className="flex flex-col items-center py-16">
          <p style={{ color: 'oklch(0.50 0.007 75)' }}>案件が見つかりませんでした</p>
          <button onClick={() => router.back()} className="mt-4 text-sm" style={{ color: 'oklch(0.73 0.12 78)' }}>戻る</button>
        </div>
      </div>
    )
  }

  const keysInfo: { model: string; usage: string }[] = project.keys_info ?? []

  return (
    <div className="min-h-dvh">
      <WorkerHeader title={project.name} showBack />

      <div className="px-4 py-4 space-y-3">
        {/* ステータス */}
        <div className="flex items-center gap-2">
          <span className="inline-flex text-xs px-3 py-1 rounded-full font-medium"
            style={project.status === 'completed'
              ? { background: 'oklch(0.72 0.18 150 / 0.15)', color: 'oklch(0.72 0.18 150)' }
              : { background: 'oklch(0.73 0.12 78 / 0.15)', color: 'oklch(0.73 0.12 78)' }}>
            {project.status === 'completed' ? '完了' : '進行中'}
          </span>
          {project.code && (
            <span className="text-xs" style={{ color: 'oklch(0.45 0.006 75)' }}>{project.code}</span>
          )}
        </div>

        {/* 基本情報 */}
        <Section title="現場情報">
          <InfoRow icon={MapPin}      label="作業場所"     value={project.location_name} />
          <InfoRow icon={Phone}       label="電話番号"     value={project.phone} />
          <InfoRow icon={ShieldAlert} label="緊急連絡先"   value={project.emergency_contact} />
          <InfoRow icon={Clock}       label="作業可能時間" value={project.business_hours} />
          <InfoRow icon={Info}        label="注意事項"     value={project.notes} />
        </Section>

        {/* AIに質問 */}
        <Link
          href={`/projects/${jobId}/chat`}
          className="flex items-center justify-between rounded-2xl p-4 transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, oklch(0.09 0.005 255 / 0.90), oklch(0.07 0.004 255 / 0.95))',
            border: '1px solid oklch(0.73 0.12 78 / 0.35)',
            boxShadow: '0 0 20px oklch(0.73 0.12 78 / 0.08)',
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: 'oklch(0.73 0.12 78 / 0.15)', border: '1px solid oklch(0.73 0.12 78 / 0.35)' }}
            >
              <Sparkles className="h-5 w-5" style={{ color: 'oklch(0.73 0.12 78)', filter: 'drop-shadow(0 0 4px oklch(0.73 0.12 78 / 0.7))' }} />
            </span>
            <div>
              <p className="text-sm font-bold" style={{ color: 'oklch(0.92 0.008 75)' }}>AIに質問</p>
              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0.007 75)' }}>写真で質問・マニュアル参照</p>
            </div>
          </div>
          <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: 'oklch(0.73 0.12 78 / 0.15)', color: 'oklch(0.73 0.12 78)' }}>
            開く
          </span>
        </Link>

        {/* 入館情報 */}
        {(project.entry_route || project.key_borrowing) && (
          <Section title="入館・鍵情報">
            <InfoRow icon={Navigation} label="入館経路" value={project.entry_route} />
            {project.key_borrowing && (
              <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: 'oklch(0.73 0.12 78 / 0.12)' }}>
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
    </div>
  )
}
