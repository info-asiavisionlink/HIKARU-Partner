import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const uid  = req.cookies.get('hk_p_uid')?.value
  const role = req.cookies.get('hk_p_role')?.value

  if (!uid || role !== 'partner') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const type = req.nextUrl.searchParams.get('type') // spot | recurring | hotel | null

  const admin = createAdminClient()

  // entity_id（partners.id）を取得
  const { data: profile } = await admin
    .from('profiles')
    .select('entity_type, entity_id')
    .eq('id', uid)
    .single()

  if (!profile || profile.entity_type !== 'partner') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 担当プロジェクトID取得
  const { data: assignments } = await admin
    .from('project_assignments')
    .select('project_id')
    .eq('assignee_type', 'partner')
    .eq('assignee_id', profile.entity_id)

  const projectIds = (assignments ?? []).map((a: any) => a.project_id)

  if (projectIds.length === 0) {
    return NextResponse.json({ data: [] })
  }

  let query = admin
    .from('projects')
    .select(
      'id, name, code, project_type, status, start_date, end_date, work_start_time, work_end_time, location_name, phone, emergency_contact, business_hours, notes, entry_route, key_borrowing, keys_info'
    )
    .in('id', projectIds)
    .order('created_at', { ascending: false })

  if (type && ['spot', 'recurring', 'hotel'].includes(type)) {
    query = query.eq('project_type', type)
  }

  const { data: projects } = await query

  return NextResponse.json({ data: projects ?? [] })
}
