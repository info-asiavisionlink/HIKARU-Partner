import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const uid  = req.cookies.get('hk_w_uid')?.value
  const role = req.cookies.get('hk_w_role')?.value

  if (!uid || !['employee','partner'].includes(role ?? '')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // entity_id（partners.id）を取得
  const { data: profile } = await admin
    .from('profiles')
    .select('entity_type, entity_id')
    .eq('id', uid)
    .single()

  if (!profile || !['employee', 'partner'].includes(profile.entity_type)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 担当プロジェクトID取得（employee/partner共通）
  const { data: assignments } = await admin
    .from('project_assignments')
    .select('project_id')
    .eq('assignee_type', profile.entity_type)
    .eq('assignee_id', profile.entity_id)

  const projectIds = (assignments ?? []).map((a: any) => a.project_id)

  if (projectIds.length === 0) {
    return NextResponse.json({ data: [] })
  }

  const { data: projects } = await admin
    .from('projects')
    .select('id, name, code, status, location_name, phone, emergency_contact, business_hours, notes, entry_route, key_borrowing, keys_info')
    .in('id', projectIds)
    .in('status', ['active', 'completed'])
    .order('created_at', { ascending: false })

  return NextResponse.json({ data: projects ?? [] })
}
