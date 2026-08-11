import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const uid  = req.cookies.get('hk_w_uid')?.value
  const role = req.cookies.get('hk_w_role')?.value

  if (!uid || !['employee','partner'].includes(role ?? '')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const year  = parseInt(req.nextUrl.searchParams.get('year')  ?? String(new Date().getFullYear()), 10)
  const month = parseInt(req.nextUrl.searchParams.get('month') ?? String(new Date().getMonth() + 1), 10)

  // 指定月の初日・末日
  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)
  const firstStr = firstDay.toISOString().slice(0, 10)
  const lastStr  = lastDay.toISOString().slice(0, 10)

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('entity_type, entity_id')
    .eq('id', uid)
    .single()

  if (!profile || profile.entity_type !== 'partner') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: assignments } = await admin
    .from('project_assignments')
    .select('project_id')
    .eq('assignee_type', 'partner')
    .eq('assignee_id', profile.entity_id)

  const projectIds = (assignments ?? []).map((a: any) => a.project_id)

  if (projectIds.length === 0) {
    return NextResponse.json({ data: [] })
  }

  // start_date <= 月末 AND end_date >= 月初 (当月と期間が重なる案件)
  const { data: projects } = await admin
    .from('projects')
    .select('id, name, code, project_type, status, start_date, end_date, work_start_time, work_end_time, location_name')
    .in('id', projectIds)
    .lte('start_date', lastStr)
    .gte('end_date', firstStr)
    .order('start_date', { ascending: true })

  return NextResponse.json({ data: projects ?? [] })
}
