import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { evaluateBeforeAfter, checkPhotoQuality } from '@/modules/quality-ai'

// ============================================================
// POST /api/ai/quality
// action: 'check' | 'evaluate' | 'evaluate-all'
// ============================================================

function getUid(req: NextRequest) {
  const uid  = req.cookies.get('hk_w_uid')?.value
  const role = req.cookies.get('hk_w_role')?.value
  if (!uid || !['employee','partner'].includes(role ?? '')) return null
  return uid
}

export async function POST(req: NextRequest) {
  const uid = getUid(req)
  if (!uid) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })

  const admin = createAdminClient()
  const body = await req.json()
  const { action } = body

  switch (action) {
    case 'check':        return handlePhotoCheck(body)
    case 'evaluate':     return handleEvaluate(body, uid, admin)
    case 'evaluate-all': return handleEvaluateAll(body, uid, admin)
    default:
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'actionが不正です' } }, { status: 400 })
  }
}

// ---- 写真品質チェック ----
async function handlePhotoCheck(body: any) {
  const { photoUrl, locationName } = body
  if (!photoUrl || !locationName) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'パラメータ不足' } }, { status: 400 })
  }

  try {
    const result = await checkPhotoQuality(photoUrl, locationName)
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json({ success: false, error: { code: 'AI_ERROR', message: (err as Error).message } }, { status: 500 })
  }
}

// ---- 単一スポット評価 ----
async function handleEvaluate(body: any, uid: string, admin: any) {
  const { jobId, spotId, beforeUrl, afterUrl, beforePhotoId, afterPhotoId } = body

  if (!jobId || !spotId || !beforeUrl || !afterUrl) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'パラメータ不足' } }, { status: 400 })
  }

  // jobアクセス権確認
  const { data: job } = await admin.from('jobs').select('id').eq('id', jobId).eq('worker_id', uid).maybeSingle()
  if (!job) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'アクセス権がありません' } }, { status: 403 })

  // 撮影箇所名を取得
  const { data: spot } = await admin.from('photo_spots').select('name').eq('id', spotId).single()
  const locationName = spot?.name ?? '撮影箇所'

  try {
    const result = await evaluateBeforeAfter(beforeUrl, afterUrl, locationName)

    // Validation Gate: NGならDB保存しない
    if (!result.evaluationPossible) {
      return NextResponse.json({
        success:           false,
        validationFailed:  true,
        evaluationPossible: false,
        validation:        result.validation,
        error: { code: 'VALIDATION_FAILED', message: '写真が評価条件を満たしていません' },
        issues:            result.validation?.issues ?? [],
      })
    }

    const { error } = await admin.from('ai_evaluations').upsert(
      {
        job_id:          jobId,
        spot_id:         spotId,
        before_photo_id: beforePhotoId ?? null,
        after_photo_id:  afterPhotoId  ?? null,
        score:           result.score,
        dirty_removal:   result.breakdown.dirtyRemoval,
        thoroughness:    result.breakdown.thoroughness,
        shine:           result.breakdown.shine,
        passed:          result.passed,
        recommendation:  result.recommendation,
        before_summary:  result.beforeAnalysis.summary,
        after_summary:   result.afterAnalysis.summary,
        comparison:      result.comparison,
        comment:         result.comment,
        improvements:    result.improvements,
        remaining_issues: result.afterAnalysis.remainingIssues,
        photo_quality_ok: result.photoQuality.beforeValid && result.photoQuality.afterValid,
        photo_quality_issues: result.photoQuality.issues,
      },
      { onConflict: 'job_id,spot_id' }
    )

    if (error) console.error('[quality] DB save error:', error.message)

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error('[quality] evaluate error:', (err as Error).message)
    return NextResponse.json({ success: false, error: { code: 'AI_ERROR', message: (err as Error).message } }, { status: 500 })
  }
}

// ---- 全スポット一括評価 ----
async function handleEvaluateAll(body: any, uid: string, admin: any) {
  const { jobId } = body

  if (!jobId) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'jobIdが必要です' } }, { status: 400 })
  }

  // jobアクセス権確認
  const { data: job } = await admin.from('jobs').select('id, project_id').eq('id', jobId).eq('worker_id', uid).single()
  if (!job) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'このジョブへのアクセス権がありません' } }, { status: 403 })

  // 撮影箇所一覧取得
  const { data: spots } = await admin
    .from('photo_spots')
    .select('id, name, is_required')
    .eq('project_id', job.project_id)
    .order('order_num', { ascending: true })

  // このジョブの写真を取得
  const { data: photos } = await admin
    .from('photos')
    .select('id, spot_id, photo_type, url')
    .eq('job_id', jobId)

  const photoMap: Record<string, { before?: any; after?: any }> = {}
  for (const p of (photos ?? [])) {
    if (!photoMap[p.spot_id]) photoMap[p.spot_id] = {}
    if (p.photo_type === 'before') photoMap[p.spot_id].before = p
    if (p.photo_type === 'after')  photoMap[p.spot_id].after  = p
  }

  const results: { spotId: string; spotName: string; success: boolean; validationFailed?: boolean; validation?: any; issues?: string[]; data?: any; error?: string }[] = []

  for (const spot of (spots ?? [])) {
    const pair = photoMap[spot.id]
    if (!pair?.before?.url || !pair?.after?.url) {
      results.push({ spotId: spot.id, spotName: spot.name, success: false, error: '写真が揃っていません' })
      continue
    }

    try {
      const result = await evaluateBeforeAfter(pair.before.url, pair.after.url, spot.name)

      // Validation Gate: NGならDB保存スキップ
      if (!result.evaluationPossible) {
        results.push({
          spotId:            spot.id,
          spotName:          spot.name,
          success:           false,
          validationFailed:  true,
          validation:        result.validation,
          error:             '写真が評価条件を満たしていません',
          issues:            result.validation?.issues ?? [],
        })
        continue
      }

      await admin.from('ai_evaluations').upsert(
        {
          job_id:          jobId,
          spot_id:         spot.id,
          before_photo_id: pair.before.id,
          after_photo_id:  pair.after.id,
          score:           result.score,
          dirty_removal:   result.breakdown.dirtyRemoval,
          thoroughness:    result.breakdown.thoroughness,
          shine:           result.breakdown.shine,
          passed:          result.passed,
          recommendation:  result.recommendation,
          before_summary:  result.beforeAnalysis.summary,
          after_summary:   result.afterAnalysis.summary,
          comparison:      result.comparison,
          comment:         result.comment,
          improvements:    result.improvements,
          remaining_issues: result.afterAnalysis.remainingIssues,
          photo_quality_ok: result.photoQuality.beforeValid && result.photoQuality.afterValid,
          photo_quality_issues: result.photoQuality.issues,
        },
        { onConflict: 'job_id,spot_id' }
      )

      results.push({ spotId: spot.id, spotName: spot.name, success: true, data: result })
    } catch (err) {
      results.push({ spotId: spot.id, spotName: spot.name, success: false, error: (err as Error).message })
    }
  }

  // 総合スコア計算
  const evaluated = results.filter((r) => r.success && r.data)
  const averageScore = evaluated.length > 0
    ? Math.round(evaluated.reduce((sum, r) => sum + r.data.score, 0) / evaluated.length)
    : 0

  return NextResponse.json({
    success: true,
    data: {
      results,
      summary: {
        total:     spots?.length ?? 0,
        evaluated: evaluated.length,
        passed:    evaluated.filter((r) => r.data.passed).length,
        failed:    evaluated.filter((r) => !r.data.passed).length,
        averageScore,
        allPassed: evaluated.every((r) => r.data.passed) && evaluated.length > 0,
      },
    },
  })
}

// ============================================================
// GET /api/ai/quality?jobId=xxx — 評価結果一覧取得
// ============================================================

export async function GET(req: NextRequest) {
  const uid = getUid(req)
  if (!uid) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })

  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'jobIdが必要です' } }, { status: 400 })

  const admin = createAdminClient()

  // jobアクセス権チェック
  const { data: job } = await admin.from('jobs').select('id').eq('id', jobId).eq('worker_id', uid).maybeSingle()
  if (!job) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'アクセス権がありません' } }, { status: 403 })

  const { data, error } = await admin
    .from('ai_evaluations')
    .select('*, photo_spots(name, is_required)')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: data ?? [] })
}
