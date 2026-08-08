import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// ============================================================
// GET  /api/jobs/today?projectId=xxx        — 今日のjob取得
// POST /api/jobs/today  { projectId }        — 存在すれば取得、なければ作成
// ============================================================

function getUid(req: NextRequest) {
  const uid  = req.cookies.get('hk_p_uid')?.value
  const role = req.cookies.get('hk_p_role')?.value
  if (!uid || role !== 'partner') return null
  return uid
}

export async function GET(req: NextRequest) {
  const uid = getUid(req)
  if (!uid) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'projectIdが必要です' } }, { status: 400 })

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await admin
    .from('jobs')
    .select('*')
    .eq('project_id', projectId)
    .eq('worker_id', uid)
    .eq('work_date', today)
    .neq('status', 'cancelled')
    .maybeSingle()

  return NextResponse.json({ success: true, data: data ?? null })
}

export async function POST(req: NextRequest) {
  const uid = getUid(req)
  if (!uid) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const projectId: string | undefined = body.projectId
  if (!projectId) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'projectIdが必要です' } }, { status: 400 })

  const admin = createAdminClient()

  // 会社ID (partners.id) を profile から取得
  const { data: profile } = await admin
    .from('profiles')
    .select('entity_type, entity_id')
    .eq('id', uid)
    .single()

  const companyId = profile?.entity_type === 'partner' ? profile.entity_id : null

  const today = new Date().toISOString().split('T')[0]

  // 既存 job
  const { data: existing } = await admin
    .from('jobs')
    .select('*')
    .eq('project_id', projectId)
    .eq('worker_id', uid)
    .eq('work_date', today)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (existing) return NextResponse.json({ success: true, data: existing })

  // 作成
  const { data: created, error } = await admin
    .from('jobs')
    .insert({
      project_id: projectId,
      worker_id:  uid,
      company_id: companyId,
      status:     'in_progress',
      work_date:  today,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: created })
}
