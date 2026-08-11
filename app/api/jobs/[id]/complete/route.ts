import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// ============================================================
// POST /api/jobs/[id]/complete — job完了
// ============================================================

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const uid  = req.cookies.get('hk_w_uid')?.value
  const role = req.cookies.get('hk_w_role')?.value
  if (!uid || !['employee','partner'].includes(role ?? '')) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })
  }

  const { id } = await ctx.params
  const admin = createAdminClient()
  const { error } = await admin
    .from('jobs')
    .update({
      status:       'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('worker_id', uid)

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
