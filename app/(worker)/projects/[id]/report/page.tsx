'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTodayJob } from '@/services/jobs.service'
import {
  generateReport, loadReportHistory, loadReport,
  getScoreColor, getScoreLabel,
  type ReportContent, type ReportListItem,
} from '@/services/report.service'
import { WorkerHeader } from '@/components/layouts/WorkerHeader'
import { calcWorkDuration, formatDateTime, formatDate } from '@/modules/report-ai'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import {
  FileText, Download, Printer, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp,
  Sparkles, History,
} from 'lucide-react'

const GOLD    = 'oklch(0.73 0.12 78)'
const SUCCESS = 'oklch(0.72 0.18 150)'
const WARNING = 'oklch(0.75 0.18 60)'
const ERROR   = 'oklch(0.65 0.20 25)'

const PRINT_STYLES = `
@media print {
  .no-print { display: none !important; }
  body { background: white !important; color: black !important; }
  .report-container { padding: 0 !important; }
  .report-page {
    box-shadow: none !important;
    border-radius: 0 !important;
    max-width: none !important;
  }
  @page {
    size: A4;
    margin: 15mm 15mm 20mm 15mm;
  }
  .spot-card { page-break-inside: avoid; }
  .section-header { page-break-after: avoid; }
}
`

function RecommendationBadge({ rec }: { rec: 'pass' | 'check' | 'redo' | null }) {
  if (!rec) return null
  const cfg = {
    pass:  { label: '合格',       color: SUCCESS },
    check: { label: '要確認',     color: WARNING },
    redo:  { label: '再清掃推奨', color: ERROR },
  }[rec]
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}40` }}
    >
      {cfg.label}
    </span>
  )
}

function ScoreCircle({ score }: { score: number | null }) {
  const color = getScoreColor(score)
  return (
    <div
      className={cn('flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 font-bold shrink-0', color)}
      style={
        score != null && score >= 75 ? { borderColor: SUCCESS, background: `${SUCCESS}15` } :
        score != null && score >= 60 ? { borderColor: WARNING, background: `${WARNING}15` } :
        score != null                ? { borderColor: ERROR,   background: `${ERROR}15` } :
                                       { borderColor: 'oklch(0.30 0.005 260)', background: 'oklch(0.15 0.005 260)' }
      }
    >
      <span className="text-xl leading-none">{score ?? '—'}</span>
      {score != null && <span className="text-[9px] opacity-70">点</span>}
    </div>
  )
}

// ============================================================
// 報告書本体
// ============================================================
function ReportDocument({ content, reportVersion, reportDate }: {
  content: ReportContent
  reportVersion: number
  reportDate: string
}) {
  const { project, store, client, job, spots, summary } = content

  return (
    <div className="report-page bg-white text-neutral-900 max-w-[800px] mx-auto shadow-xl print:shadow-none">
      {/* ヘッダー */}
      <div className="px-8 py-6 print:px-6 print:py-5" style={{ background: GOLD }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium opacity-80 tracking-widest uppercase" style={{ color: 'oklch(0.06 0.003 260)' }}>HIKARU Quality Report</p>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'oklch(0.06 0.003 260)' }}>清掃品質報告書</h1>
          </div>
          <div className="text-right text-sm opacity-90" style={{ color: 'oklch(0.06 0.003 260)' }}>
            <p>No. {reportVersion.toString().padStart(3, '0')}</p>
            <p>{new Date(reportDate).toLocaleDateString('ja-JP')}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-7 print:px-6 print:py-5 print:space-y-5">

        {/* 概要 */}
        <section>
          <h2 className="section-header text-sm font-bold text-neutral-600 uppercase tracking-wider mb-3 border-b border-neutral-200 pb-1.5">
            作業概要
          </h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                ['案件名',       project.name],
                ['クライアント', client.name],
                ['店舗名',       store.name],
                ['作業場所',     store.name ?? '—'],
                ['担当者',       job.worker_name],
                ['作業日',       formatDate(job.work_date)],
                ['開始時刻',     formatDateTime(job.started_at)],
                ['終了時刻',     job.completed_at ? formatDateTime(job.completed_at) : '—'],
                ['作業時間',     calcWorkDuration(job.started_at, job.completed_at)],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 w-32 text-neutral-500 font-medium">{label}</td>
                  <td className="py-2 font-medium text-neutral-900">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 品質スコアサマリー */}
        <section>
          <h2 className="section-header text-sm font-bold text-neutral-600 uppercase tracking-wider mb-3 border-b border-neutral-200 pb-1.5">
            品質評価サマリー
          </h2>
          <div className="flex items-center gap-6 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4">
            <ScoreCircle score={summary.overall_score} />
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className={cn('text-4xl font-bold', getScoreColor(summary.overall_score))}>
                  {summary.overall_score}
                </span>
                <span className="text-lg text-neutral-500">/ 100点</span>
                <span className={cn('text-sm font-semibold ml-2', getScoreColor(summary.overall_score))}>
                  {getScoreLabel(summary.overall_score)}
                </span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: SUCCESS }} />
                  合格: {summary.passed_count}箇所
                </span>
                {summary.check_count > 0 && (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" style={{ color: WARNING }} />
                    要確認: {summary.check_count}箇所
                  </span>
                )}
                {summary.redo_count > 0 && (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" style={{ color: ERROR }} />
                    再清掃: {summary.redo_count}箇所
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 作業内容要約 */}
        <section>
          <h2 className="section-header text-sm font-bold text-neutral-600 uppercase tracking-wider mb-3 border-b border-neutral-200 pb-1.5">
            本日の作業内容
          </h2>
          <p className="text-sm leading-relaxed text-neutral-900">{summary.work_summary}</p>
        </section>

        {/* 品質評価総括 */}
        <section>
          <h2 className="section-header text-sm font-bold text-neutral-600 uppercase tracking-wider mb-3 border-b border-neutral-200 pb-1.5">
            品質評価
          </h2>
          <p className="text-sm leading-relaxed text-neutral-900">{summary.quality_assessment}</p>
        </section>

        {/* 箇所別詳細 */}
        <section>
          <h2 className="section-header text-sm font-bold text-neutral-600 uppercase tracking-wider mb-4 border-b border-neutral-200 pb-1.5">
            撮影箇所別詳細 （{spots.length}箇所）
          </h2>
          <div className="space-y-5">
            {spots.map((spot) => (
              <div key={spot.name} className="spot-card border border-neutral-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between bg-neutral-50 px-4 py-2.5 border-b border-neutral-200">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0"
                      style={{ background: GOLD, color: 'oklch(0.06 0.003 260)' }}
                    >
                      {spot.order}
                    </span>
                    <h3 className="font-bold text-base text-neutral-900">{spot.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {spot.score != null && (
                      <span className={cn('text-sm font-bold', getScoreColor(spot.score))}>
                        {spot.score}点
                      </span>
                    )}
                    <RecommendationBadge rec={spot.recommendation} />
                  </div>
                </div>

                <div className="px-4 py-4 space-y-3">
                  {(spot.before_url || spot.after_url) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Before（清掃前）</p>
                        {spot.before_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={spot.before_url}
                            alt={`${spot.name} Before`}
                            className="w-full aspect-[4/3] object-cover rounded-xl border border-neutral-200"
                          />
                        ) : (
                          <div className="aspect-[4/3] bg-neutral-100 rounded-xl flex items-center justify-center">
                            <p className="text-xs text-neutral-500">写真なし</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: SUCCESS }}>After（清掃後）</p>
                        {spot.after_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={spot.after_url}
                            alt={`${spot.name} After`}
                            className="w-full aspect-[4/3] object-cover rounded-xl border border-neutral-200"
                          />
                        ) : (
                          <div className="aspect-[4/3] bg-neutral-100 rounded-xl flex items-center justify-center">
                            <p className="text-xs text-neutral-500">写真なし</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {spot.ai_comment && (
                    <div className="rounded-xl px-3 py-2.5" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30` }}>
                      <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'oklch(0.35 0.08 78)' }}>
                        <Sparkles className="h-3 w-3" /> AIコメント
                      </p>
                      <p className="text-sm text-neutral-900 leading-relaxed">{spot.ai_comment}</p>
                    </div>
                  )}

                  {spot.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 mb-1">改善提案</p>
                      <ul className="space-y-0.5">
                        {spot.improvements.map((imp, i) => (
                          <li key={i} className="text-xs text-neutral-900 flex items-start gap-1">
                            <span className="mt-0.5 shrink-0" style={{ color: WARNING }}>•</span>
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 総合評価 */}
        <section>
          <h2 className="section-header text-sm font-bold text-neutral-600 uppercase tracking-wider mb-3 border-b border-neutral-200 pb-1.5">
            総合評価
          </h2>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 space-y-3">
            <p className="text-sm leading-relaxed text-neutral-900">{summary.total_comment}</p>
            {summary.next_recommendations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-2">次回作業への推奨事項</p>
                <ul className="space-y-1">
                  {summary.next_recommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-neutral-900 flex items-start gap-1.5">
                      <span className="mt-0.5" style={{ color: 'oklch(0.35 0.08 78)' }}>→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* フッター */}
        <footer className="border-t border-neutral-200 pt-4 mt-6 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            <p className="font-semibold" style={{ color: 'oklch(0.35 0.08 78)' }}>HIKARU 清掃品質管理システム</p>
            <p>生成日時: {new Date(content.generated_at).toLocaleString('ja-JP')}</p>
          </div>
          <div className="text-xs text-neutral-500 text-right">
            <p>担当: {job.worker_name}</p>
            <p>Ver.{reportVersion}</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

// ============================================================
// 履歴パネル
// ============================================================
function HistoryPanel({
  history,
  onSelect,
  selectedId,
}: {
  history: ReportListItem[]
  onSelect: (id: string) => void
  selectedId?: string
}) {
  const [open, setOpen] = React.useState(false)

  if (history.length === 0) return null

  return (
    <div
      className="no-print rounded-2xl overflow-hidden"
      style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: `1px solid ${GOLD}15` }}
    >
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" style={{ color: 'oklch(0.55 0.007 75)' }} />
          <span className="text-sm font-medium" style={{ color: 'oklch(0.90 0.008 75)' }}>報告書履歴（{history.length}件）</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4" style={{ color: GOLD }} /> : <ChevronDown className="h-4 w-4" style={{ color: GOLD }} />}
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${GOLD}10` }}>
          {history.map((h) => (
            <button
              key={h.id}
              onClick={() => onSelect(h.id)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors"
              style={selectedId === h.id
                ? { background: `${GOLD}12`, borderTop: `1px solid ${GOLD}10` }
                : { borderTop: `1px solid ${GOLD}10` }
              }
            >
              <span style={{ color: 'oklch(0.75 0.008 75)' }}>
                Ver.{h.version} — {new Date(h.created_at).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              {h.overall_score != null && (
                <span className={cn('font-semibold', getScoreColor(h.overall_score))}>
                  {h.overall_score}点
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// メインページ
// ============================================================
export default function ReportPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const router = useRouter()

  const [jobId, setJobId]           = React.useState<string | null>(null)
  const [content, setContent]       = React.useState<ReportContent | null>(null)
  const [reportId, setReportId]     = React.useState<string | undefined>()
  const [reportDate, setReportDate] = React.useState<string>('')
  const [reportVersion, setReportVersion] = React.useState(1)
  const [history, setHistory]       = React.useState<ReportListItem[]>([])
  const [loading, setLoading]       = React.useState(true)
  const [generating, setGenerating] = React.useState(false)

  React.useEffect(() => {
    async function init() {
      const job = await getTodayJob(projectId)
      if (!job) { router.push(`/projects/${projectId}`); return }
      setJobId(job.id)

      const hist = await loadReportHistory(job.id)
      setHistory(hist)

      if (hist.length > 0) {
        const latest = hist[0]
        const report = await loadReport(latest.id)
        if (report) {
          setContent(report.content)
          setReportId(latest.id)
          setReportDate(report.created_at)
          setReportVersion(report.version)
        }
      }

      setLoading(false)
    }
    init()
  }, [projectId, router])

  async function handleGenerate() {
    if (!jobId) return
    setGenerating(true)
    const result = await generateReport(jobId)
    if (result.success && result.content) {
      setContent(result.content)
      setReportId(result.reportId)
      setReportDate(new Date().toISOString())
      setReportVersion(result.content.version ?? history.length + 1)
      const hist = await loadReportHistory(jobId)
      setHistory(hist)
      toast.success('報告書を生成しました')
    } else {
      toast.error(`生成に失敗しました: ${result.error}`)
    }
    setGenerating(false)
  }

  async function handleSelectHistory(id: string) {
    const report = await loadReport(id)
    if (report) {
      setContent(report.content)
      setReportId(id)
      setReportDate(report.created_at)
      setReportVersion(report.version)
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div>
        <WorkerHeader title="報告書" showBack />
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
        </div>
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      <div>
        <div className="no-print">
          <WorkerHeader
            title="報告書"
            showBack
            rightAction={content ? (
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{ background: 'oklch(0.15 0.005 260)', color: 'oklch(0.90 0.008 75)' }}
                >
                  <Printer className="h-3.5 w-3.5" /> 印刷
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  style={{ background: GOLD, color: 'oklch(0.06 0.003 260)' }}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> 再生成
                </button>
              </div>
            ) : undefined}
          />
        </div>

        <div className="report-container px-4 py-4 space-y-4 pb-24">
          {/* 履歴 */}
          {history.length > 0 && (
            <HistoryPanel
              history={history}
              onSelect={handleSelectHistory}
              selectedId={reportId}
            />
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full border-4 animate-spin mb-4" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
              <p className="text-base font-semibold" style={{ color: 'oklch(0.92 0.008 75)' }}>AI報告書を生成中…</p>
              <p className="mt-1 text-sm" style={{ color: 'oklch(0.55 0.007 75)' }}>
                評価データを分析し、コメントを作成しています
              </p>
            </div>
          )}

          {!generating && !content && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="h-16 w-16 mb-4" style={{ color: 'oklch(0.35 0.006 75)' }} />
              <p className="text-base font-semibold" style={{ color: 'oklch(0.92 0.008 75)' }}>報告書がありません</p>
              <p className="mt-1 text-sm" style={{ color: 'oklch(0.55 0.007 75)' }}>
                AI品質評価完了後に報告書を生成できます
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="mt-6 flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold disabled:opacity-50"
                style={{ background: GOLD, color: 'oklch(0.06 0.003 260)', boxShadow: `0 0 20px ${GOLD}30` }}
              >
                <Sparkles className="h-5 w-5" />
                AI報告書を生成する
              </button>
            </div>
          )}

          {!generating && content && (
            <>
              <div className="no-print flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold"
                  style={{ background: 'oklch(0.15 0.005 260)', color: 'oklch(0.90 0.008 75)' }}
                >
                  <Download className="h-4 w-4" /> PDFダウンロード
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold"
                  style={{ background: 'oklch(0.15 0.005 260)', color: 'oklch(0.90 0.008 75)' }}
                >
                  <Printer className="h-4 w-4" /> 印刷
                </button>
              </div>

              <ReportDocument
                content={content}
                reportVersion={reportVersion}
                reportDate={reportDate}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
