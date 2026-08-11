import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/projects/[id]/spots — 撮影箇所一覧
// assignment ownership チェック済み（IDOR対策）
// ============================================================

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const uid  = req.cookies.get('hk_w_uid')?.value
  const role = req.cookies.get('hk_w_role')?.value
  if (!uid || !['employee', 'partner'].includes(role ?? '')) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })
  }

  const { id: projectId } = await ctx.params
  const admin = createAdminClient()

  // 自分がこのプロジェクトにassignされているか確認（IDOR対策）
  const { data: profile } = await admin
    .from('profiles')
    .select('entity_type, entity_id')
    .eq('id', uid)
    .single()

  if (!profile || !['employee', 'partner'].includes(profile.entity_type)) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })
  }

  const { data: assignment } = await admin
    .from('project_assignments')
    .select('project_id')
    .eq('project_id', projectId)
    .eq('assignee_type', profile.entity_type)
    .eq('assignee_id', profile.entity_id)
    .maybeSingle()

  if (!assignment) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'アクセス権がありません' } }, { status: 403 })
  }

  const { data, error } = await admin
    .from('photo_spots')
    .select('*')
    .eq('project_id', projectId)
    .order('order_num', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: data ?? [] })
}
