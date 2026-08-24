import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  generateReportContent,
  formatDate,
  type ReportContent,
  type ReportSpot,
} from '@/modules/report-ai'
import type { SpotInput } from '@/modules/report-ai/prompts'

function getUid(req: NextRequest) {
  const uid  = req.cookies.get('hk_w_uid')?.value
  const role = req.cookies.get('hk_w_role')?.value
  if (!uid || !['employee','partner'].includes(role ?? '')) return null
  return uid
}

// ============================================================
// Source Snapshot（JOB-C3: Report dedup）
//
// 写真URL・AI評価内容のdeterministicなfingerprint。
// 同じsource → snapshot一致 → OpenAI 0 call。
// 変更あり    → snapshot不一致 → OpenAI 1 call + version +1。
// ============================================================

type SourceSnapshot = {
  photos: Record<string, { before: string | null; after: string | null }>
  evaluations: Record<string, {
    evaluated_before_url: string | null
    evaluated_after_url:  string | null
    score:                number | null
    recommendation:       string | null
  }>
}

// keyの挿入順序に依存しない安定比較用stringify
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + (value as unknown[]).map(stableStringify).join(',') + ']'
  const keys = Object.keys(value as Record<string, unknown>).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify((value as any)[k])).join(',') + '}'
}

function buildSourceSnapshot(
  allSpots:    { id: string }[],
  photos:      { spot_id: string; photo_type: string; url: string | null }[] | null,
  evaluations: { spot_id: string; evaluated_before_url?: string | null; evaluated_after_url?: string | null; score?: number | null; recommendation?: string | null }[] | null,
): SourceSnapshot {
  const photoBySpot: Record<string, { before: string | null; after: string | null }> = {}
  for (const p of (photos ?? [])) {
    if (!photoBySpot[p.spot_id]) photoBySpot[p.spot_id] = { before: null, after: null }
    if (p.photo_type === 'before') photoBySpot[p.spot_id].before = p.url ?? null
    if (p.photo_type === 'after')  photoBySpot[p.spot_id].after  = p.url ?? null
  }

  const evalBySpot: Record<string, any> = {}
  for (const ev of (evaluations ?? [])) {
    evalBySpot[ev.spot_id] = ev
  }

  const snapshotPhotos: SourceSnapshot['photos']      = {}
  const snapshotEvals:  SourceSnapshot['evaluations'] = {}

  // allSpotsはorder_num ASCでソート済み → key挿入順がdeterministic
  for (const spot of allSpots) {
    const ph = photoBySpot[spot.id] ?? { before: null, after: null }
    snapshotPhotos[spot.id] = { before: ph.before, after: ph.after }

    const ev = evalBySpot[spot.id]
    snapshotEvals[spot.id] = {
      evaluated_before_url: ev?.evaluated_before_url ?? null,
      evaluated_after_url:  ev?.evaluated_after_url  ?? null,
      score:                ev?.score          ?? null,
      recommendation:       ev?.recommendation ?? null,
    }
  }

  return { photos: snapshotPhotos, evaluations: snapshotEvals }
}

function snapshotsMatch(stored: unknown, current: SourceSnapshot): boolean {
  if (!stored) return false
  return stableStringify(stored) === stableStringify(current)
}

// ============================================================
// POST /api/ai/report — 報告書生成（JOB-C3 dedup対応）
// ============================================================

export async function POST(req: NextRequest) {
  const uid = getUid(req)
  if (!uid) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })

  const { jobId } = await req.json()
  if (!jobId) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'jobIdが必要です' } }, { status: 400 })

  const admin = createAdminClient()

  try {
    // ── 1. Job取得（ownership確認込み） ──────────────────────────
    const { data: job } = await admin
      .from('jobs')
      .select(`
        id, project_id, worker_id, company_id, status,
        work_date, started_at, completed_at,
        projects(
          id, name, code, notes,
          location_name, phone, emergency_contact
        ),
        profiles(name)
      `)
      .eq('id', jobId)
      .eq('worker_id', uid)
      .single()

    if (!job) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'ジョブが見つかりません' } }, { status: 404 })
    }

    // completed guard（JOB-C6A）: snapshot比較・OpenAI・DB INSERTより前にSTOP
    if ((job as any).status === 'completed') {
      return NextResponse.json(
        { success: false, error: { code: 'JOB_ALREADY_COMPLETED', message: 'この作業は既に完了しているため変更できません。' } },
        { status: 409 },
      )
    }

    const project = (job as any).projects

    // ── 2. データ取得（N+1なし）──────────────────────────────────
    const { data: photos } = await admin
      .from('photos')
      .select('id, spot_id, photo_type, url')
      .eq('job_id', jobId)

    const { data: evaluations } = await admin
      .from('ai_evaluations')
      .select('*, photo_spots(id, name, order_num, is_required)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })

    const { data: allSpots } = await admin
      .from('photo_spots')
      .select('id, name, order_num, is_required')
      .eq('project_id', job.project_id)
      .order('order_num', { ascending: true })

    // ── 3. Source Snapshot構築（deterministic）─────────────────────
    const currentSnapshot = buildSourceSnapshot(allSpots ?? [], photos, evaluations)

    // ── 4. 最新Report取得（freshness判定 + version採番のため）────────
    const { data: latestReport } = await admin
      .from('reports')
      .select('id, version, content, overall_score, source_snapshot')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // ── 5. Freshness check: OpenAI callより前に判定 ─────────────────
    if (latestReport && snapshotsMatch(latestReport.source_snapshot, currentSnapshot)) {
      return NextResponse.json({
        success: true,
        data:    { reportId: latestReport.id, content: latestReport.content },
        reused:  true,
      })
    }

    // ── 6. STALE: データ統合 ──────────────────────────────────────
    const photoMap: Record<string, { before?: any; after?: any }> = {}
    for (const p of (photos ?? [])) {
      if (!photoMap[p.spot_id]) photoMap[p.spot_id] = {}
      if (p.photo_type === 'before') photoMap[p.spot_id].before = p
      if (p.photo_type === 'after')  photoMap[p.spot_id].after  = p
    }

    const evalMap: Record<string, any> = {}
    for (const ev of (evaluations ?? [])) {
      evalMap[ev.spot_id] = ev
    }

    const reportSpots: ReportSpot[] = (allSpots ?? []).map((spot, idx) => {
      const ev   = evalMap[spot.id]
      const pair = photoMap[spot.id]
      return {
        name:             spot.name,
        order:            idx + 1,
        score:            ev?.score ?? null,
        recommendation:   ev?.recommendation ?? null,
        before_url:       pair?.before?.url  ?? null,
        after_url:        pair?.after?.url   ?? null,
        comparison:       ev?.comparison     ?? null,
        ai_comment:       '',
        improvements:     ev?.improvements      ?? [],
        remaining_issues: ev?.remaining_issues  ?? [],
      }
    })

    // ── 7. スコア集計 ──────────────────────────────────────────────
    const scored       = reportSpots.filter((s) => s.score !== null)
    const overallScore = scored.length > 0
      ? Math.round(scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length)
      : 0

    const passedCount = reportSpots.filter((s) => s.recommendation === 'pass').length
    const checkCount  = reportSpots.filter((s) => s.recommendation === 'check').length
    const redoCount   = reportSpots.filter((s) => s.recommendation === 'redo').length

    // ── 8. OpenAI call（STALE時のみ）─────────────────────────────
    const spotInputs: SpotInput[] = reportSpots.map((s) => ({
      name:             s.name,
      score:            s.score,
      recommendation:   s.recommendation,
      comparison:       s.comparison,
      remaining_issues: s.remaining_issues,
      improvements:     s.improvements,
    }))

    const workerName   = (job as any).profiles?.name ?? '担当者'
    const workDate     = formatDate(job.work_date)
    const locationName = project?.location_name ?? project?.name ?? '—'

    const aiContent = await generateReportContent({
      storeName:  locationName,
      clientName: '—',
      workDate,
      workerName,
      spots: spotInputs,
      overallScore,
    })

    // ── 9. AIコメントをスポットに設定 ────────────────────────────
    for (const spot of reportSpots) {
      spot.ai_comment = aiContent.spot_comments[spot.name] ?? `${spot.name}の清掃を実施しました。`
    }

    // ── 10. 報告書コンテンツ構築 ──────────────────────────────────
    const version = (latestReport?.version ?? 0) + 1

    const content: ReportContent = {
      project: {
        name:  project?.name  ?? '—',
        code:  project?.code  ?? null,
        notes: project?.notes ?? null,
      },
      store: {
        name:  locationName,
        phone: project?.phone ?? null,
      },
      client: { name: '—' },
      job: {
        work_date:    job.work_date,
        started_at:   job.started_at,
        completed_at: job.completed_at,
        worker_name:  workerName,
      },
      spots: reportSpots,
      summary: {
        overall_score:        overallScore,
        passed_count:         passedCount,
        check_count:          checkCount,
        redo_count:           redoCount,
        total_spots:          reportSpots.length,
        work_summary:         aiContent.work_summary,
        quality_assessment:   aiContent.quality_assessment,
        total_comment:        aiContent.total_comment,
        next_recommendations: aiContent.next_recommendations,
      },
      generated_at: new Date().toISOString(),
      version,
    }

    // ── 11. DB保存（source_snapshot付き）──────────────────────────
    const { data: saved, error: saveErr } = await admin
      .from('reports')
      .insert({
        job_id:          jobId,
        project_id:      job.project_id,
        worker_id:       uid,
        company_id:      job.company_id,
        version,
        content,
        overall_score:   overallScore,
        source_snapshot: currentSnapshot,
      })
      .select('id')
      .single()

    if (saveErr) {
      console.error('[report] save error:', saveErr.message)
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'レポートの保存に失敗しました' } },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data: { reportId: saved.id, content }, reused: false })
  } catch (err) {
    console.error('[report] error:', (err as Error).message)
    return NextResponse.json(
      { success: false, error: { code: 'AI_ERROR', message: (err as Error).message } },
      { status: 500 },
    )
  }
}

// ============================================================
// GET /api/ai/report?jobId=xxx  — 履歴取得
// GET /api/ai/report?reportId=xxx — 特定報告書取得
// ============================================================

export async function GET(req: NextRequest) {
  const uid = getUid(req)
  if (!uid) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })

  const jobId    = req.nextUrl.searchParams.get('jobId')
  const reportId = req.nextUrl.searchParams.get('reportId')

  const admin = createAdminClient()

  if (reportId) {
    const { data, error } = await admin
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('worker_id', uid)
      .single()
    if (error || !data) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: '報告書が見つかりません' } }, { status: 404 })
    }
    return NextResponse.json({ success: true, data })
  }

  if (!jobId) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'jobIdが必要です' } }, { status: 400 })
  }

  const { data, error } = await admin
    .from('reports')
    .select('id, version, overall_score, created_at')
    .eq('job_id', jobId)
    .eq('worker_id', uid)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: data ?? [] })
}
