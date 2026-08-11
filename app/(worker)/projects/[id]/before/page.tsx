'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getOrCreateTodayJob } from '@/services/jobs.service'
import { uploadPhoto, getJobPhotos, type PhotoRow } from '@/services/photos.service'
import { WorkerHeader } from '@/components/layouts/WorkerHeader'
import { PhotoCapture } from '@/components/worker/PhotoCapture'
import { WorkProgress } from '@/components/worker/WorkProgress'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { ChevronRight } from 'lucide-react'

const GOLD    = 'oklch(0.73 0.12 78)'
const SUCCESS = 'oklch(0.72 0.18 150)'

export default function BeforePage() {
  const { id: projectId } = useParams<{ id: string }>()
  const router = useRouter()
  const [spots, setSpots]         = React.useState<any[]>([])
  const [jobId, setJobId]         = React.useState<string | null>(null)
  const [photos, setPhotos]       = React.useState<PhotoRow[]>([])
  const [uploading, setUploading] = React.useState<Record<string, boolean>>({})
  const [loading, setLoading]     = React.useState(true)

  React.useEffect(() => {
    async function load() {
      const job = await getOrCreateTodayJob(projectId)
      if (!job) { router.push(`/projects/${projectId}`); return }
      setJobId(job.id)

      const spotsRes = await fetch(`/api/projects/${projectId}/spots`, { credentials: 'include', cache: 'no-store' })
      if (spotsRes.ok) {
        const j = await spotsRes.json()
        setSpots(j.data ?? [])
      }

      const existing = await getJobPhotos(job.id)
      setPhotos(existing.filter((p) => p.photo_type === 'before'))

      setLoading(false)
    }
    load()
  }, [projectId, router])

  function getSpotPhoto(spotId: string): PhotoRow | undefined {
    return photos.find((p) => p.spot_id === spotId)
  }

  async function handleCapture(spotId: string, file: File) {
    if (!jobId) return
    setUploading((prev) => ({ ...prev, [spotId]: true }))

    const result = await uploadPhoto(jobId, spotId, 'before', file)
    if (result) {
      setPhotos((prev) => {
        const filtered = prev.filter((p) => p.spot_id !== spotId)
        return [...filtered, result]
      })
      toast.success('保存しました')
    } else {
      toast.error('保存に失敗しました')
    }

    setUploading((prev) => ({ ...prev, [spotId]: false }))
  }

  async function handleDelete(spotId: string) {
    setPhotos((prev) => prev.filter((p) => p.spot_id !== spotId))
  }

  const completedCount = spots.filter((s) => !!getSpotPhoto(s.id)).length
  const totalCount     = spots.length
  const allDone        = completedCount === totalCount && totalCount > 0

  if (loading) {
    return (
      <div>
        <WorkerHeader title="Before写真" showBack />
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <WorkerHeader title="Before写真" showBack />

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
        <WorkProgress total={totalCount} completed={completedCount} label="Before撮影" />
      </div>

      {/* 説明 */}
      <div
        className="px-4 py-3"
        style={{ background: `${GOLD}0a`, borderBottom: `1px solid ${GOLD}20` }}
      >
        <p className="text-sm font-medium" style={{ color: GOLD }}>
          清掃前の状態を撮影してください
        </p>
        <p className="text-xs mt-0.5" style={{ color: `${GOLD}b0` }}>
          必須項目（*）は必ず撮影してください
        </p>
      </div>

      {/* 撮影箇所リスト */}
      <div className="px-4 py-4 space-y-6 pb-32">
        {spots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm" style={{ color: 'oklch(0.55 0.007 75)' }}>
              撮影箇所が登録されていません
            </p>
            <p className="text-xs mt-1" style={{ color: 'oklch(0.45 0.006 75)' }}>
              管理者に撮影箇所の登録を依頼してください
            </p>
          </div>
        ) : (
          spots.map((spot, idx) => {
            const existing = getSpotPhoto(spot.id)
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
                  {spot.is_required && (
                    <span className="text-sm" style={{ color: 'oklch(0.75 0.20 25)' }}>*</span>
                  )}
                </div>
                {spot.description && (
                  <p className="text-xs pl-8" style={{ color: 'oklch(0.55 0.007 75)' }}>
                    {spot.description}
                  </p>
                )}
                <div className="pl-8">
                  <PhotoCapture
                    currentUrl={existing?.url ?? null}
                    onCapture={(file) => handleCapture(spot.id, file)}
                    onDelete={() => handleDelete(spot.id)}
                    loading={uploading[spot.id] ?? false}
                    required={spot.is_required}
                  />
                </div>
              </div>
            )
          })
        )}
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
          {allDone ? (
            <button
              onClick={() => router.push(`/projects/${projectId}/after`)}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-2xl py-4',
                'text-base font-semibold text-white transition-transform active:scale-[0.98]'
              )}
              style={{ background: SUCCESS }}
            >
              After写真へ進む <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <div className="space-y-2">
              <div
                className="rounded-xl px-3 py-2.5 text-center"
                style={{ background: 'oklch(0.75 0.18 60 / 0.15)', border: '1px solid oklch(0.75 0.18 60 / 0.3)' }}
              >
                <p className="text-sm font-medium" style={{ color: 'oklch(0.85 0.18 60)' }}>
                  残り {totalCount - completedCount}件撮影してください
                </p>
              </div>
              {completedCount > 0 && (
                <button
                  onClick={() => router.push(`/projects/${projectId}`)}
                  className="w-full rounded-2xl py-3 text-sm font-semibold"
                  style={{ background: 'oklch(0.15 0.005 260)', color: 'oklch(0.75 0.008 75)' }}
                >
                  一時中断して詳細へ戻る
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
