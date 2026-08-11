// ============================================================
// Jobs サービス — クライアントサイド専用
// API Routes 経由（cookie: hk_w_uid で認証）
// ============================================================

export interface JobRow {
  id: string
  project_id: string
  worker_id: string
  company_id: string | null
  status: 'in_progress' | 'completed' | 'cancelled'
  work_date: string
  started_at: string
  completed_at: string | null
  notes: string | null
  created_at: string
}

export async function getOrCreateTodayJob(projectId: string): Promise<JobRow | null> {
  const res = await fetch('/api/jobs/today', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body:    JSON.stringify({ projectId, create: true }),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.success ? (json.data as JobRow) : null
}

export async function getTodayJob(projectId: string): Promise<JobRow | null> {
  const res = await fetch(`/api/jobs/today?projectId=${encodeURIComponent(projectId)}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.success ? (json.data as JobRow) : null
}

export async function completeJob(jobId: string): Promise<boolean> {
  const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/complete`, {
    method:  'POST',
    credentials: 'include',
  })
  if (!res.ok) return false
  const json = await res.json()
  return !!json.success
}

export async function getJobById(jobId: string): Promise<JobRow | null> {
  const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.success ? (json.data as JobRow) : null
}
