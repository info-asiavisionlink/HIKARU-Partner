import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/jobs/[id] — job詳細取得
// ============================================================

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const uid  = req.cookies.get('hk_w_uid')?.value
  const role = req.cookies.get('hk_w_role')?.value
  if (!uid || !['employee','partner'].includes(role ?? '')) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })
  }

  const { id } = await ctx.params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('worker_id', uid)
    .single()

  if (error || !data) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'ジョブが見つかりません' } }, { status: 404 })
  }
  return NextResponse.json({ success: true, data })
}
