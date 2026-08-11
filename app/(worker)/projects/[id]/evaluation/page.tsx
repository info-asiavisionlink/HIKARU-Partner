'use client'

import * as React from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getTodayJob, completeJob } from '@/services/jobs.service'
import {
  evaluateAllSpots, loadEvaluations,
  getScoreInfo, RECOMMENDATION_CONFIG,
  type EvaluationRow,
} from '@/services/quality.service'
import { WorkerHeader } from '@/components/layouts/WorkerHeader'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import {
  Star, AlertTriangle, RefreshCw,
  ChevronDown, ChevronUp, Lightbulb, CheckCheck,
  BarChart3, FileText,
} from 'lucide-react'

const GOLD    = 'oklch(0.73 0.12 78)'
const SUCCESS = 'oklch(0.72 0.18 150)'
const WARNING = 'oklch(0.75 0.18 60)'
const ERROR   = 'oklch(0.65 0.20 25)'

function ScoreCircle({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const info = getScoreInfo(score)
  const dims = { sm: 'h-14 w-14 text-lg', md: 'h-20 w-20 text-2xl', lg: 'h-28 w-28 text-3xl' }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-full font-bold',
      dims[size], info.bgClass, info.colorClass
    )}>
      {score}
      <span className="text-[10px] font-medium opacity-70">点</span>
    </div>
  )
}

function Stars({ count, size = 'sm' }: { count: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cls}
          fill={i <= count ? GOLD : 'transparent'}
          style={{ color: i <= count ? GOLD : 'oklch(0.30 0.005 260)' }}
        />
      ))}
    </div>
  )
}

function BreakdownBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null
  const pct = Math.max(0, Math.min(100, value))
  const barColor = pct >= 75 ? SUCCESS : pct >= 60 ? WARNING : ERROR
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'oklch(0.55 0.007 75)' }}>{label}</span>
        <span className="font-semibold" style={{ color: 'oklch(0.90 0.008 75)' }}>{pct}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.15 0.005 260)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  )
}

function SpotEvaluationCard({
  evaluation,
  photos,
}: {
  evaluation: EvaluationRow
  photos: { beforeUrl?: string; afterUrl?: string }
}) {
  const [expanded, setExpanded] = React.useState(false)
  const info    = getScoreInfo(evaluation.score)
  const recCfg  = RECOMMENDATION_CONFIG[evaluation.recommendation]
  const spotName = evaluation.photo_spots?.name ?? '撮影箇所'

  const borderColor = evaluation.passed ? `${SUCCESS}40` : `${ERROR}40`

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${borderColor}` }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
        style={{ background: 'oklch(0.09 0.005 255 / 0.82)' }}
        onClick={() => setExpanded((p) => !p)}
      >
        <ScoreCircle score={evaluation.score} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm" style={{ color: 'oklch(0.92 0.008 75)' }}>{spotName}</p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={
                evaluation.recommendation === 'pass'  ? { background: `${SUCCESS}20`, color: SUCCESS } :
                evaluation.recommendation === 'check' ? { background: `${WARNING}20`, color: WARNING } :
                                                        { background: `${ERROR}20`,   color: ERROR }
              }
            >
              {recCfg.emoji} {recCfg.label}
            </span>
          </div>
          <Stars count={info.stars} />
          <p className="mt-0.5 text-xs truncate" style={{ color: 'oklch(0.60 0.008 75)' }}>{evaluation.comment}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 shrink-0" style={{ color: GOLD }} /> : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: GOLD }} />}
      </button>

      {expanded && (
        <div
          className="px-4 py-4 space-y-4"
          style={{ background: 'oklch(0.05 0.003 260 / 0.6)', borderTop: `1px solid ${GOLD}10` }}
        >
          {(photos.beforeUrl || photos.afterUrl) && (
            <div className="grid grid-cols-2 gap-2">
              {photos.beforeUrl && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold" style={{ color: 'oklch(0.55 0.007 75)' }}>Before</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photos.beforeUrl} alt="Before" className="w-full aspect-[4/3] object-cover rounded-xl" />
                </div>
              )}
              {photos.afterUrl && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold" style={{ color: SUCCESS }}>After</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photos.afterUrl} alt="After" className="w-full aspect-[4/3] object-cover rounded-xl" />
                </div>
              )}
            </div>
          )}

          {evaluation.comparison && (
            <div className="rounded-xl px-3 py-2.5" style={{ background: `${GOLD}0a`, border: `1px solid ${GOLD}20` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: GOLD }}>Before → After 比較</p>
              <p className="text-sm" style={{ color: 'oklch(0.90 0.008 75)' }}>{evaluation.comparison}</p>
            </div>
          )}

          <div className="space-y-2.5">
            <p className="text-xs font-semibold" style={{ color: 'oklch(0.55 0.007 75)' }}>評価詳細</p>
            <BreakdownBar label="汚れ除去度"    value={evaluation.dirty_removal} />
            <BreakdownBar label="丁寧さ・細部"  value={evaluation.thoroughness} />
            <BreakdownBar label="光沢・清潔感"  value={evaluation.shine} />
          </div>

          {evaluation.remaining_issues && evaluation.remaining_issues.length > 0 && (
            <div className="rounded-xl px-3 py-2.5" style={{ background: `${WARNING}15`, border: `1px solid ${WARNING}30` }}>
              <p className="text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: WARNING }}>
                <AlertTriangle className="h-3.5 w-3.5" /> 残っている問題
              </p>
              <ul className="space-y-0.5">
                {evaluation.remaining_issues.map((issue, i) => (
                  <li key={i} className="text-xs" style={{ color: 'oklch(0.90 0.008 75)' }}>・{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {evaluation.improvements && evaluation.improvements.length > 0 && (
            <div className="rounded-xl px-3 py-2.5" style={{ background: 'oklch(0.09 0.005 255 / 0.6)', border: `1px solid ${GOLD}15` }}>
              <p className="text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'oklch(0.90 0.008 75)' }}>
                <Lightbulb className="h-3.5 w-3.5" style={{ color: WARNING }} /> 改善提案
              </p>
              <ul className="space-y-0.5">
                {evaluation.improvements.map((imp, i) => (
                  <li key={i} className="text-xs" style={{ color: 'oklch(0.90 0.008 75)' }}>・{imp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// メインコンテンツ
// ============================================================
function EvaluationContent() {
  const { id: projectId } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoRun = searchParams.get('run') === '1'

  const [evaluations, setEvaluations] = React.useState<EvaluationRow[]>([])
  const [photos, setPhotos]           = React.useState<any[]>([])
  const [jobId, setJobId]             = React.useState<string | null>(null)
  const [loading, setLoading]         = React.useState(true)
  const [evaluating, setEvaluating]   = React.useState(false)
  const [completing, setCompleting]   = React.useState(false)

  React.useEffect(() => {
    async function init() {
      const job = await getTodayJob(projectId)
      if (!job) { router.push(`/projects/${projectId}`); return }
      setJobId(job.id)

      // 写真データ（API経由で取得）
      const photosRes = await fetch(`/api/photos?jobId=${job.id}`, { credentials: 'include', cache: 'no-store' })
      if (photosRes.ok) {
        const j = await photosRes.json()
        setPhotos(j.data ?? [])
      }

      const existing = await loadEvaluations(job.id)
      setEvaluations(existing)

      setLoading(false)

      if (autoRun && existing.length === 0) {
        setTimeout(() => runEvaluation(job.id), 300)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function runEvaluation(jId?: string) {
    const targetJobId = jId ?? jobId
    if (!targetJobId) return
    setEvaluating(true)

    const result = await evaluateAllSpots(targetJobId)
    if (result.success) {
      const updated = await loadEvaluations(targetJobId)
      setEvaluations(updated)
      toast.success('AI品質評価が完了しました')
    } else {
      toast.error(`評価に失敗しました: ${result.error}`)
    }

    setEvaluating(false)
  }

  async function handleComplete() {
    if (!jobId) return
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

  function getSpotPhotos(spotId: string) {
    return {
      beforeUrl: photos.find((p) => p.spot_id === spotId && p.photo_type === 'before')?.url,
      afterUrl:  photos.find((p) => p.spot_id === spotId && p.photo_type === 'after')?.url,
    }
  }

  const computedSummary = React.useMemo(() => {
    if (evaluations.length === 0) return null
    const avg = Math.round(evaluations.reduce((s, e) => s + e.score, 0) / evaluations.length)
    return {
      averageScore: avg,
      passed:       evaluations.filter((e) => e.passed).length,
      failed:       evaluations.filter((e) => !e.passed).length,
      total:        evaluations.length,
      allPassed:    evaluations.every((e) => e.passed),
    }
  }, [evaluations])

  const overallInfo = computedSummary ? getScoreInfo(computedSummary.averageScore) : null

  if (loading) {
    return (
      <div>
        <WorkerHeader title="AI品質評価" showBack />
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <WorkerHeader title="AI品質評価" showBack />

      <div className="pb-32">
        {evaluating && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-16 w-16 rounded-full border-4 animate-spin mb-4" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
            <p className="text-base font-semibold" style={{ color: 'oklch(0.92 0.008 75)' }}>AI品質評価中…</p>
            <p className="mt-1 text-sm" style={{ color: 'oklch(0.55 0.007 75)' }}>写真を解析しています。しばらくお待ちください。</p>
          </div>
        )}

        {!evaluating && computedSummary && overallInfo && (
          <div
            className="mx-4 mt-4 rounded-2xl p-5"
            style={computedSummary.allPassed
              ? { background: SUCCESS, color: 'white' }
              : { background: `${WARNING}15`, border: `1px solid ${WARNING}40` }
            }
          >
            <div className="flex items-center gap-4">
              <div
                className="flex flex-col items-center justify-center h-20 w-20 rounded-full font-bold shrink-0"
                style={computedSummary.allPassed
                  ? { background: 'oklch(1 0 0 / 0.2)', color: 'white' }
                  : {}
                }
              >
                <span className="text-2xl">{computedSummary.averageScore}</span>
                <span className="text-[10px] opacity-80">点</span>
              </div>
              <div>
                <p
                  className="font-bold text-base"
                  style={!computedSummary.allPassed ? { color: 'oklch(0.92 0.008 75)' } : {}}
                >
                  {computedSummary.allPassed ? '全箇所合格！' : `${computedSummary.failed}箇所が要改善`}
                </p>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: !computedSummary.allPassed ? 'oklch(0.55 0.007 75)' : 'oklch(1 0 0 / 0.8)' }}
                >
                  {computedSummary.passed}/{computedSummary.total}箇所合格
                </p>
                <Stars count={overallInfo.stars} size="md" />
              </div>
            </div>
          </div>
        )}

        {!evaluating && evaluations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <BarChart3 className="h-14 w-14 mb-4" style={{ color: 'oklch(0.40 0.006 75)' }} />
            <p className="text-base font-semibold" style={{ color: 'oklch(0.90 0.008 75)' }}>まだAI評価が実行されていません</p>
            <p className="mt-1 text-sm" style={{ color: 'oklch(0.55 0.007 75)' }}>下のボタンから品質チェックを開始してください</p>
          </div>
        )}

        {!evaluating && evaluations.length > 0 && (
          <div className="px-4 mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'oklch(0.55 0.007 75)' }}>
              箇所別評価 ({evaluations.length}件)
            </p>
            {evaluations.map((ev) => (
              <SpotEvaluationCard
                key={ev.id}
                evaluation={ev}
                photos={getSpotPhotos(ev.spot_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 固定フッター */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-3 space-y-2 md:pl-64"
        style={{
          background: 'oklch(0.05 0.003 260 / 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${GOLD}15`,
          zIndex: 30,
        }}
      >
        <div className="max-w-2xl mx-auto md:mx-0 space-y-2">
          {evaluations.length === 0 ? (
            <button
              onClick={() => runEvaluation()}
              disabled={evaluating}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold disabled:opacity-50"
              style={{ background: GOLD, color: 'oklch(0.06 0.003 260)', boxShadow: `0 0 20px ${GOLD}30` }}
            >
              <BarChart3 className="h-5 w-5" />
              AI品質チェックを実行
            </button>
          ) : (
            <>
              <Link
                href={`/projects/${projectId}/report`}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold"
                style={{ background: GOLD, color: 'oklch(0.06 0.003 260)' }}
              >
                <FileText className="h-5 w-5" />
                AI報告書を作成する
              </Link>

              {computedSummary?.allPassed ? (
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold disabled:opacity-50"
                  style={{ background: `${SUCCESS}15`, color: SUCCESS, border: `1px solid ${SUCCESS}40` }}
                >
                  {completing ? (
                    <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  {completing ? '処理中…' : '作業完了'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href={`/projects/${projectId}/after`}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold"
                    style={{ background: `${WARNING}15`, color: WARNING }}
                  >
                    <RefreshCw className="h-4 w-4" /> 再清掃する
                  </Link>
                  <button
                    onClick={() => runEvaluation()}
                    disabled={evaluating}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold disabled:opacity-50"
                    style={{ background: 'oklch(0.15 0.005 260)', color: 'oklch(0.90 0.008 75)' }}
                  >
                    <BarChart3 className="h-4 w-4" /> 再評価
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Suspense Wrapper（useSearchParams 使用のため必須）
// ============================================================
export default function EvaluationPage() {
  return (
    <React.Suspense
      fallback={
        <div>
          <WorkerHeader title="AI品質評価" showBack />
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
          </div>
        </div>
      }
    >
      <EvaluationContent />
    </React.Suspense>
  )
}
