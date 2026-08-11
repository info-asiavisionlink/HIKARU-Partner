'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTodayJob, completeJob } from '@/services/jobs.service'
import { uploadPhoto, getJobPhotos, type PhotoRow } from '@/services/photos.service'
import { WorkerHeader } from '@/components/layouts/WorkerHeader'
import { PhotoCapture } from '@/components/worker/PhotoCapture'
import { WorkProgress } from '@/components/worker/WorkProgress'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { ArrowLeft, BarChart3 } from 'lucide-react'

const GOLD    = 'oklch(0.73 0.12 78)'
const SUCCESS = 'oklch(0.72 0.18 150)'

export default function AfterPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const router = useRouter()
  const [spots, setSpots]         = React.useState<any[]>([])
  const [jobId, setJobId]         = React.useState<string | null>(null)
  const [allPhotos, setAllPhotos] = React.useState<PhotoRow[]>([])
  const [uploading, setUploading] = React.useState<Record<string, boolean>>({})
  const [loading, setLoading]     = React.useState(true)
  const [completing, setCompleting] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      const job = await getTodayJob(projectId)
      if (!job) { router.push(`/projects/${projectId}`); return }
      if (job.status === 'completed') { router.push(`/projects/${projectId}`); return }
      setJobId(job.id)

      const spotsRes = await fetch(`/api/projects/${projectId}/spots`, { credentials: 'include', cache: 'no-store' })
      if (spotsRes.ok) {
        const j = await spotsRes.json()
        setSpots(j.data ?? [])
      }

      const existing = await getJobPhotos(job.id)
      setAllPhotos(existing)

      setLoading(false)
    }
    load()
  }, [projectId, router])

  function getSpotPhoto(spotId: string, type: 'before' | 'after'): PhotoRow | undefined {
    return allPhotos.find((p) => p.spot_id === spotId && p.photo_type === type)
  }

  async function handleCapture(spotId: string, file: File) {
    if (!jobId) return
    setUploading((prev) => ({ ...prev, [spotId]: true }))

    const result = await uploadPhoto(jobId, spotId, 'after', file)
    if (result) {
      setAllPhotos((prev) => {
        const filtered = prev.filter((p) => !(p.spot_id === spotId && p.photo_type === 'after'))
        return [...filtered, result]
      })
      toast.success('保存しました')
    } else {
      toast.error('保存に失敗しました')
    }
    setUploading((prev) => ({ ...prev, [spotId]: false }))
  }

  async function handleDelete(spotId: string) {
    setAllPhotos((prev) => prev.filter((p) => !(p.spot_id === spotId && p.photo_type === 'after')))
  }

  async function handleComplete() {
    if (!jobId) return
    const requiredSpots = spots.filter((s) => s.is_required)
    const missing = requiredSpots.filter((s) => !getSpotPhoto(s.id, 'after'))
    if (missing.length > 0) {
      toast.error(`必須撮影箇所があと${missing.length}件残っています`)
      return
    }
    setCompleting(true)
    const ok = await completeJob(jobId)
    if (ok) {
      toast.success('作業完了しました！お疲れ様でした！')
      router.replace(`/projects/${projectId}`)
    } else {
      toast.error('完了処理に失敗しました')
    }
    setCompleting(false)
  }

  const afterCount    = spots.filter((s) => !!getSpotPhoto(s.id, 'after')).length
  const totalCount    = spots.length
  const requiredCount = spots.filter((s) => s.is_required).length
  const requiredDone  = spots.filter((s) => s.is_required && !!getSpotPhoto(s.id, 'after')).length
  const canComplete   = requiredDone >= requiredCount

  if (loading) {
    return (
      <div>
        <WorkerHeader title="After写真" showBack />
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <WorkerHeader title="After写真" showBack />

      {/* 進捗 */}
      <div
        className="sticky z-10 px-4 py-3"
        style={{
          top: 56,
          background: 'oklch(0.07 0.004 255 / 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${GOLD}12`,
        }}
      >
        <WorkProgress total={totalCount} completed={afterCount} label="After撮影" />
      </div>

      {/* 説明 */}
      <div
        className="px-4 py-3"
        style={{ background: `${SUCCESS}12`, borderBottom: `1px solid ${SUCCESS}30` }}
      >
        <p className="text-sm font-medium" style={{ color: SUCCESS }}>
          清掃後の状態を撮影してください
        </p>
        <p className="text-xs mt-0.5" style={{ color: `${SUCCESS}b0` }}>
          すべて撮影すると作業完了できます
        </p>
      </div>

      {/* 撮影箇所リスト */}
      <div className="px-4 py-4 space-y-6 pb-40">
        {spots.map((spot, idx) => {
          const beforePhoto = getSpotPhoto(spot.id, 'before')
          const afterPhoto  = getSpotPhoto(spot.id, 'after')
          return (
            <div key={spot.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0"
                  style={{ background: `${GOLD}12`, color: GOLD }}
                >
                  {idx + 1}
                </span>
                <span className="font-semibold text-base" style={{ color: 'oklch(0.92 0.008 75)' }}>
                  {spot.name}
                </span>
                {spot.is_required && <span className="text-sm" style={{ color: 'oklch(0.75 0.20 25)' }}>*</span>}
              </div>

              <div className="pl-8 grid grid-cols-2 gap-3">
                {/* Before */}
                <div className="space-y-1">
                  <p className="text-xs font-medium" style={{ color: 'oklch(0.55 0.007 75)' }}>Before</p>
                  {beforePhoto?.url ? (
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={beforePhoto.url} alt="Before" className="w-full h-full object-cover opacity-90" />
                    </div>
                  ) : (
                    <div
                      className="aspect-[4/3] rounded-xl flex items-center justify-center"
                      style={{ background: 'oklch(0.09 0.005 255 / 0.5)', border: '1px dashed oklch(0.30 0.005 260)' }}
                    >
                      <p className="text-[10px]" style={{ color: 'oklch(0.55 0.007 75)' }}>未撮影</p>
                    </div>
                  )}
                </div>

                {/* After */}
                <div className="space-y-1">
                  <p className="text-xs font-medium" style={{ color: SUCCESS }}>After</p>
                  <PhotoCapture
                    currentUrl={afterPhoto?.url ?? null}
                    onCapture={(file) => handleCapture(spot.id, file)}
                    onDelete={() => handleDelete(spot.id)}
                    loading={uploading[spot.id] ?? false}
                    required={spot.is_required}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

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
          {canComplete ? (
            <div className="space-y-2">
              <button
                onClick={() => router.push(`/projects/${projectId}/evaluation?run=1`)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-2xl py-4',
                  'text-base font-semibold transition-transform active:scale-[0.98]'
                )}
                style={{ background: GOLD, color: 'oklch(0.06 0.003 260)', boxShadow: `0 0 20px ${GOLD}30` }}
              >
                <BarChart3 className="h-5 w-5" />
                AI品質チェックへ進む
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="w-full rounded-2xl py-3 text-sm font-medium disabled:opacity-50"
                style={{ background: 'oklch(0.15 0.005 260)', color: 'oklch(0.75 0.008 75)' }}
              >
                {completing ? '処理中…' : 'AIチェックなしで完了する'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div
                className="rounded-xl px-3 py-2.5 text-center"
                style={{ background: 'oklch(0.75 0.18 60 / 0.15)', border: '1px solid oklch(0.75 0.18 60 / 0.3)' }}
              >
                <p className="text-sm font-medium" style={{ color: 'oklch(0.85 0.18 60)' }}>
                  残り {requiredCount - requiredDone}件撮影してください
                </p>
              </div>
              <button
                onClick={() => router.push(`/projects/${projectId}/before`)}
                className="w-full flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold"
                style={{ background: 'oklch(0.15 0.005 260)', color: 'oklch(0.75 0.008 75)' }}
              >
                <ArrowLeft className="h-4 w-4" /> Before写真に戻る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
