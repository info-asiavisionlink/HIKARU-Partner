import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const uid  = req.cookies.get('hk_w_uid')?.value
  const role = req.cookies.get('hk_w_role')?.value

  if (!uid || !['employee','partner'].includes(role ?? '')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, email, entity_type, entity_id')
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

  let projects: any[] = []
  if (projectIds.length > 0) {
    const { data } = await admin
      .from('projects')
      .select('id, name, location_name, status')
      .in('id', projectIds)
      .in('status', ['active'])
      .order('created_at', { ascending: false })
      .limit(10)
    projects = data ?? []
  }

  // 本日のjob一覧
  const today = new Date().toISOString().slice(0, 10)
  const { data: jobs } = await admin
    .from('jobs')
    .select('id, project_id, status, started_at, completed_at, projects(name, location_name)')
    .eq('worker_id', uid)
    .eq('work_date', today)
    .neq('status', 'cancelled')

  const jobList = jobs ?? []
  const summary = {
    inProgress: jobList.filter((j: any) => j.status === 'in_progress').length,
    completed:  jobList.filter((j: any) => j.status === 'completed').length,
    total:      jobList.length,
    jobs:       jobList,
  }

  // projectsにtodayJob情報をマージ
  const projectsWithJob = projects.map((p) => ({
    ...p,
    todayJob: jobList.find((j: any) => j.project_id === p.id) ?? null,
  }))

  return NextResponse.json({
    profile,
    projects: projectsWithJob,
    summary,
    totalAssigned: projectIds.length,
  })
}
