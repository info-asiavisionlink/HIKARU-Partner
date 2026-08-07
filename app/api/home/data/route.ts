import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const uid  = req.cookies.get('hk_p_uid')?.value
  const role = req.cookies.get('hk_p_role')?.value

  if (!uid || role !== 'partner') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, email, entity_type, entity_id')
    .eq('id', uid)
    .single()

  if (!profile || profile.entity_type !== 'partner') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: partner } = await admin
    .from('partners')
    .select('id, company_name')
    .eq('id', profile.entity_id)
    .single()

  const { data: assignments } = await admin
    .from('project_assignments')
    .select('project_id')
    .eq('assignee_type', 'partner')
    .eq('assignee_id', profile.entity_id)

  const projectIds = (assignments ?? []).map((a: any) => a.project_id)

  let projects: any[] = []
  if (projectIds.length > 0) {
    const { data } = await admin
      .from('projects')
      .select('id, name, location_name, status')
      .in('id', projectIds)
      .order('created_at', { ascending: false })
      .limit(5)
    projects = data ?? []
  }

  return NextResponse.json({
    profile: { ...profile, partner },
    projects,
    totalAssigned: projectIds.length,
  })
}
