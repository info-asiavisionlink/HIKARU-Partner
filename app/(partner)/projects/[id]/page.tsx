'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Phone, ShieldAlert, Clock, Info, Key, Navigation, ArrowLeft,
  Calendar, Zap, RotateCcw, Hotel, PlayCircle, Camera, CheckCircle2,
  BookOpen, Sparkles, BarChart3, FileText,
} from 'lucide-react'
import { getOrCreateTodayJob, completeJob, type JobRow } from '@/services/jobs.service'
import { getJobPhotos, type PhotoRow } from '@/services/photos.service'
import { WorkProgress, SpotStatusDot } from '@/components/worker/WorkProgress'
import { toast } from '@/lib/toast'

const GOLD    = 'oklch(0.73 0.12 78)'
const SUCCESS = 'oklch(0.72 0.18 150)'

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

// ============================================================
// AIボタングリッド
// ============================================================
function ActionTile({
  href, icon: Icon, label, primary, iconBg, iconColor,
}: {
  href: string
  icon: React.ElementType
  label: string
  primary?: boolean
  iconBg?: string
  iconColor?: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl px-2 py-3.5 transition-transform active:scale-[0.97]"
      style={primary
        ? { background: GOLD, color: 'oklch(0.06 0.003 260)', boxShadow: `0 0 20px ${GOLD}30` }
        : { background: 'oklch(0.09 0.005 255 / 0.82)', border: `1px solid ${GOLD}15`, color: 'oklch(0.90 0.008 75)' }
      }
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={primary
          ? { background: 'oklch(1 0 0 / 0.2)', color: 'oklch(0.06 0.003 260)' }
          : { background: iconBg ?? `${GOLD}12`, color: iconColor ?? GOLD }
        }
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-[11px] font-semibold">{label}</p>
    </Link>
  )
}

// ============================================================
// メインページ
// ============================================================
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [project, setProject] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  const [photoSpots, setPhotoSpots] = React.useState<any[]>([])
  const [activeJob,  setActiveJob]  = React.useState<JobRow | null>(null)
  const [photos,     setPhotos]     = React.useState<PhotoRow[]>([])

  const [starting,   setStarting]   = React.useState(false)
  const [completing, setCompleting] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      const projRes = await fetch('/api/projects', { credentials: 'include', cache: 'no-store' })
      if (projRes.status === 401) { router.replace('/login'); return }
      const projJson = await projRes.json().catch(() => ({}))
      const found = (projJson.data ?? []).find((p: any) => p.id === id)
      setProject(found ?? null)

      // 撮影箇所（API経由）
      const spotsRes = await fetch(`/api/projects/${id}/spots`, { credentials: 'include', cache: 'no-store' })
      if (spotsRes.ok) {
        const j = await spotsRes.json()
        setPhotoSpots(j.data ?? [])
      }

      // 今日のjob
      const todayRes = await fetch(`/api/jobs/today?projectId=${id}`, { credentials: 'include', cache: 'no-store' })
      if (todayRes.ok) {
        const j = await todayRes.json()
        const job = j.data as JobRow | null
        if (job) {
          setActiveJob(job)
          const ph = await getJobPhotos(job.id)
          setPhotos(ph)
        }
      }

      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleStartWork() {
    setStarting(true)
    const job = await getOrCreateTodayJob(id)
    if (!job) {
      toast.error('作業開始に失敗しました')
      setStarting(false)
      return
    }
    setActiveJob(job)
    router.push(`/projects/${id}/before`)
  }

  async function handleComplete() {
    if (!activeJob) return
    const requiredSpots  = photoSpots.filter((s) => s.is_required)
    const completedSpots = requiredSpots.filter((s) => {
      const hasBefore = photos.some((p) => p.spot_id === s.id && p.photo_type === 'before')
      const hasAfter  = photos.some((p) => p.spot_id === s.id && p.photo_type === 'after')
      return hasBefore && hasAfter
    })

    if (completedSpots.length < requiredSpots.length) {
      toast.error(`必須撮影箇所があと${requiredSpots.length - completedSpots.length}件残っています`)
      return
    }

    setCompleting(true)
    const ok = await completeJob(activeJob.id)
    if (ok) {
      setActiveJob({ ...activeJob, status: 'completed', completed_at: new Date().toISOString() })
      toast.success('作業完了しました！お疲れ様でした！')
    } else {
      toast.error('完了処理に失敗しました')
    }
    setCompleting(false)
  }

  // ---- 統計 ----
  const beforeCount = photoSpots.filter((s) => photos.some((p) => p.spot_id === s.id && p.photo_type === 'before')).length
  const afterCount  = photoSpots.filter((s) => photos.some((p) => p.spot_id === s.id && p.photo_type === 'after')).length
  const totalSpots  = photoSpots.length
  const isJobCompleted = activeJob?.status === 'completed'

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
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
    <div className="max-w-2xl space-y-4 pb-32">
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

      {/* 完了バナー */}
      {isJobCompleted && (
        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: `${SUCCESS}15`, border: `1px solid ${SUCCESS}40` }}
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: SUCCESS }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: SUCCESS }}>作業完了</p>
            {activeJob?.completed_at && (
              <p className="text-xs" style={{ color: `${SUCCESS}b0` }}>
                {new Date(activeJob.completed_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} に完了
              </p>
            )}
          </div>
        </div>
      )}

      {/* 進捗（作業中のみ） */}
      {activeJob && !isJobCompleted && totalSpots > 0 && (
        <Section title="本日の進捗">
          <div className="space-y-3">
            <WorkProgress total={totalSpots} completed={beforeCount} label="Before撮影" />
            <WorkProgress total={totalSpots} completed={afterCount}  label="After撮影" />
          </div>
        </Section>
      )}

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

      {/* 撮影箇所一覧 */}
      {totalSpots > 0 && activeJob && (
        <Section title="撮影箇所">
          <div className="space-y-2 pt-1">
            {photoSpots.map((spot) => {
              const hasBefore = photos.some((p) => p.spot_id === spot.id && p.photo_type === 'before')
              const hasAfter  = photos.some((p) => p.spot_id === spot.id && p.photo_type === 'after')
              return (
                <div
                  key={spot.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: 'oklch(0.05 0.003 260 / 0.6)', border: `1px solid ${GOLD}10` }}
                >
                  <SpotStatusDot hasBefore={hasBefore} hasAfter={hasAfter} required={spot.is_required} />
                  <span className="flex-1 text-sm" style={{ color: 'oklch(0.90 0.008 75)' }}>{spot.name}</span>
                  {!spot.is_required && (
                    <span className="text-[10px]" style={{ color: 'oklch(0.55 0.007 75)' }}>任意</span>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* AIグリッド（作業中/完了両方） */}
      {(activeJob || isJobCompleted) && (
        <Section title="AI機能">
          <div className="grid grid-cols-2 gap-2 pt-1">
            <ActionTile
              href={`/projects/${id}/manual`}
              icon={BookOpen}
              label="マニュアル"
              iconBg={`${GOLD}12`}
              iconColor={GOLD}
            />
            <ActionTile
              href={`/projects/${id}/chat`}
              icon={Sparkles}
              label="AIに質問"
              primary
            />
            {activeJob && !isJobCompleted && (
              <>
                <ActionTile
                  href={`/projects/${id}/before`}
                  icon={Camera}
                  label="Before撮影"
                  iconBg="oklch(0.55 0.15 240 / 0.15)"
                  iconColor="oklch(0.75 0.15 240)"
                />
                <ActionTile
                  href={`/projects/${id}/after`}
                  icon={Camera}
                  label="After撮影"
                  iconBg={`${SUCCESS}15`}
                  iconColor={SUCCESS}
                />
              </>
            )}
            <ActionTile
              href={`/projects/${id}/evaluation`}
              icon={BarChart3}
              label="AI品質評価"
              iconBg={`${SUCCESS}15`}
              iconColor={SUCCESS}
            />
            <ActionTile
              href={`/projects/${id}/report`}
              icon={FileText}
              label="報告書"
              iconBg="oklch(0.75 0.18 60 / 0.15)"
              iconColor="oklch(0.85 0.18 60)"
            />
          </div>
        </Section>
      )}

      {/* 固定フッターボタン */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-3 md:pl-64"
        style={{
          background: 'oklch(0.05 0.003 260 / 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${GOLD}15`,
          zIndex: 30,
        }}
      >
        <div className="max-w-2xl mx-auto md:mx-0">
          {isJobCompleted ? (
            <div className="flex gap-2">
              <Link
                href={`/projects/${id}/report`}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold"
                style={{ background: GOLD, color: 'oklch(0.06 0.003 260)' }}
              >
                <FileText className="h-5 w-5" /> 報告書
              </Link>
              <button
                onClick={() => router.push('/projects')}
                className="flex-1 rounded-2xl py-3.5 text-base font-semibold"
                style={{ background: 'oklch(0.15 0.005 260)', color: 'oklch(0.75 0.008 75)' }}
              >
                一覧に戻る
              </button>
            </div>
          ) : activeJob ? (
            <div className="flex gap-2">
              <Link
                href={`/projects/${id}/${beforeCount < totalSpots ? 'before' : 'after'}`}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold"
                style={{ background: GOLD, color: 'oklch(0.06 0.003 260)' }}
              >
                <Camera className="h-5 w-5" />
                {beforeCount < totalSpots ? 'Before撮影' : 'After撮影'}
              </Link>
              {afterCount === totalSpots && totalSpots > 0 && (
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="flex-1 rounded-2xl py-3.5 text-base font-semibold disabled:opacity-50"
                  style={{ background: SUCCESS, color: 'white' }}
                >
                  {completing ? '処理中…' : '作業完了'}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleStartWork}
              disabled={starting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold disabled:opacity-50"
              style={{ background: GOLD, color: 'oklch(0.06 0.003 260)', boxShadow: `0 0 20px ${GOLD}30` }}
            >
              {starting ? (
                <div className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <PlayCircle className="h-5 w-5" />
              )}
              {starting ? '準備中…' : '作業を開始する'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
