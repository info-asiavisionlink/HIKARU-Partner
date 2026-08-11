import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// ============================================================
// GET /api/projects/[id]/spots — 撮影箇所一覧
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
    .from('photo_spots')
    .select('*')
    .eq('project_id', id)
    .order('order_num', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: data ?? [] })
}
