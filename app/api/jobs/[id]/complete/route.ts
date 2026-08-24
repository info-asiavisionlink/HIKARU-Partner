import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// ============================================================
// Evaluation Freshness（JOB-C2）
// URL完全一致のみ有効。NULL評価はSTALE扱い。
// ============================================================

function isEvaluationFresh(
  evaluation: { evaluated_before_url: string | null; evaluated_after_url: string | null } | null | undefined,
  currentBeforeUrl: string,
  currentAfterUrl:  string,
): boolean {
  return !!(
    evaluation?.evaluated_before_url &&
    evaluation?.evaluated_after_url &&
    evaluation.evaluated_before_url === currentBeforeUrl &&
    evaluation.evaluated_after_url  === currentAfterUrl
  )
}

// ============================================================
// POST /api/jobs/[id]/complete — job完了（Server Guard付き）
//
// Guard順序:
//   1. 認証
//   2. Job取得 + ownership確認（なければ404）
//   3. 既にcompleted → idempotent return（completed_at変更しない）
//   4. 必須Photo Spots取得（is_required=true）
//   5. Before写真完全チェック（必須Spotのみ）  → 409
//   6. After写真完全チェック（必須Spotのみ）   → 409
//   7. AI Evaluation存在チェック（必須Spotのみ）→ 409
//   8. Evaluation freshnessチェック            → 409 EVALUATION_STALE
//   9. REDO recommendation ブロック           → 409
//  10. 全条件クリア → completed に更新
//
// AI calls: 0 / DB reads: 4 (fixed, no N+1) / DB writes: 1
// ============================================================

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const uid  = req.cookies.get('hk_w_uid')?.value
  const role = req.cookies.get('hk_w_role')?.value
  if (!uid || !['employee', 'partner'].includes(role ?? '')) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
      { status: 401 },
    )
  }

  const { id } = await ctx.params
  const admin = createAdminClient()

  // ── 1. Job取得 + ownership確認 ──────────────────────────────
  const { data: job, error: jobError } = await admin
    .from('jobs')
    .select('id, project_id, status')
    .eq('id', id)
    .eq('worker_id', uid)
    .maybeSingle()

  if (jobError || !job) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'ジョブが見つかりません' } },
      { status: 404 },
    )
  }

  // ── 2. 既にcompleted → idempotent（completed_atを変更しない） ─
  if (job.status === 'completed') {
    return NextResponse.json({ success: true })
  }

  // ── 3. 必須Photo Spots取得 ──────────────────────────────────
  const { data: requiredSpots } = await admin
    .from('photo_spots')
    .select('id, name')
    .eq('project_id', job.project_id)
    .eq('is_required', true)

  const required = requiredSpots ?? []

  // 必須Spotが0件の場合はGuardをスキップ（既存案件の互換性維持）
  if (required.length > 0) {
    const requiredIds = required.map((s) => s.id)

    // ── 4. 写真を一括取得（N+1なし） ──────────────────────────
    const { data: photos } = await admin
      .from('photos')
      .select('spot_id, photo_type, url')
      .eq('job_id', id)
      .in('spot_id', requiredIds)

    const photoList = photos ?? []

    // URL map（freshness check用）
    const beforeUrlBySpot: Record<string, string> = {}
    const afterUrlBySpot:  Record<string, string> = {}
    for (const p of photoList) {
      if (p.photo_type === 'before') beforeUrlBySpot[p.spot_id] = p.url ?? ''
      if (p.photo_type === 'after')  afterUrlBySpot[p.spot_id]  = p.url ?? ''
    }

    // ── 5. Before写真チェック ─────────────────────────────────
    const missingBefore = required
      .filter((s) => !photoList.some((p) => p.spot_id === s.id && p.photo_type === 'before'))
      .map((s) => s.id)

    if (missingBefore.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code:           'REQUIRED_BEFORE_MISSING',
            message:        '必須撮影箇所のBefore写真が不足しています。',
            missingSpotIds: missingBefore,
          },
        },
        { status: 409 },
      )
    }

    // ── 6. After写真チェック ──────────────────────────────────
    const missingAfter = required
      .filter((s) => !photoList.some((p) => p.spot_id === s.id && p.photo_type === 'after'))
      .map((s) => s.id)

    if (missingAfter.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code:           'REQUIRED_AFTER_MISSING',
            message:        '必須撮影箇所のAfter写真が不足しています。',
            missingSpotIds: missingAfter,
          },
        },
        { status: 409 },
      )
    }

    // ── 7. AI Evaluation一括取得（N+1なし） ───────────────────
    const { data: evals } = await admin
      .from('ai_evaluations')
      .select('spot_id, recommendation, evaluated_before_url, evaluated_after_url')
      .eq('job_id', id)
      .in('spot_id', requiredIds)

    const evalList = evals ?? []

    // ── 8. Evaluation存在チェック ─────────────────────────────
    const missingEval = required
      .filter((s) => !evalList.some((e) => e.spot_id === s.id))
      .map((s) => s.id)

    if (missingEval.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code:           'EVALUATION_MISSING',
            message:        '必須撮影箇所のAI品質評価が完了していません。',
            missingSpotIds: missingEval,
          },
        },
        { status: 409 },
      )
    }

    // ── 8. Evaluation freshnessチェック（JOB-C2）────────────────
    // 写真が撮り直された後に古いEvaluationでcompleteできないようにする
    const staleSpots = required
      .filter((s) => {
        const ev = evalList.find((e) => e.spot_id === s.id)
        return !isEvaluationFresh(ev, beforeUrlBySpot[s.id] ?? '', afterUrlBySpot[s.id] ?? '')
      })
      .map((s) => s.id)

    if (staleSpots.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code:    'EVALUATION_STALE',
            message: '写真が更新されているためAI品質評価を再実行してください。',
            spotIds: staleSpots,
          },
        },
        { status: 409 },
      )
    }

    // ── 9. REDO recommendation チェック ───────────────────────
    const redoSpots = evalList
      .filter((e) => e.recommendation === 'redo')
      .map((e) => e.spot_id)

    if (redoSpots.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code:     'QUALITY_REDO_REQUIRED',
            message:  '再清掃・再評価が必要な撮影箇所があります。',
            spotIds:  redoSpots,
          },
        },
        { status: 409 },
      )
    }
  }

  // ── 10. 全条件クリア → completed に更新 ──────────────────────
  const { error } = await admin
    .from('jobs')
    .update({
      status:       'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('worker_id', uid)

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 },
    )
  }
  return NextResponse.json({ success: true })
}
