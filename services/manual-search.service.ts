import { SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// Manual Search Service
//
// 現在: キーワード検索（全マニュアルをAIコンテキストへ渡す方式）
// 将来: pgvector / Semantic Search へ差し替え可能な構造
//
// 検索優先順位:
//   1. Project-specific manual (project_id 一致)
//   2. Company manual (company_id 一致, is_template=true または project_id=null)
//
// セキュリティ:
//   - 必ず company_id でフィルタリング（他社マニュアルは取得しない）
//   - project_id でのフィルタリングで更に絞り込む
//   - Service Role使用時もownership確認後のみ実行
// ============================================================

export interface ManualSearchResult {
  id: string
  type: string
  title: string
  content: string | null
  file_url: string | null
  source: 'project' | 'company'
}

export interface ManualSearchParams {
  adminClient: SupabaseClient
  projectId: string
  companyId: string
}

// ============================================================
// メインの検索関数（将来ここをvector searchに差し替え可能）
// ============================================================

export async function searchManuals(
  params: ManualSearchParams
): Promise<ManualSearchResult[]> {
  const { adminClient, projectId, companyId } = params

  // 1. Project-specific manuals（最優先）
  const { data: projectManuals } = await adminClient
    .from('manuals')
    .select('id, type, title, content, file_url')
    .eq('project_id', projectId)
    .eq('company_id', companyId)  // 必ずcompany_idでフィルタ（他社データ混入防止）
    .order('order_num', { ascending: true })

  // 2. Company-level manuals（project_id=NULL かつ company_idが一致）
  const { data: companyManuals } = await adminClient
    .from('manuals')
    .select('id, type, title, content, file_url')
    .is('project_id', null)
    .eq('company_id', companyId)  // 必ずcompany_idでフィルタ（他社データ混入防止）
    .order('order_num', { ascending: true })

  const results: ManualSearchResult[] = [
    ...(projectManuals ?? []).map((m) => ({ ...m, source: 'project' as const })),
    ...(companyManuals ?? []).map((m) => ({ ...m, source: 'company' as const })),
  ]

  return results
}

// ============================================================
// company_id取得ヘルパー
// worker の profile から company_id を解決する
// ============================================================

export async function getWorkerCompanyId(
  adminClient: SupabaseClient,
  workerId: string
): Promise<string | null> {
  const { data: profile } = await adminClient
    .from('profiles')
    .select('entity_type, entity_id')
    .eq('id', workerId)
    .single()

  if (!profile) return null

  if (profile.entity_type === 'employee') {
    const { data } = await adminClient
      .from('employees')
      .select('company_id')
      .eq('id', profile.entity_id)
      .single()
    return data?.company_id ?? null
  }

  if (profile.entity_type === 'partner') {
    const { data } = await adminClient
      .from('partners')
      .select('company_id')
      .eq('id', profile.entity_id)
      .single()
    return data?.company_id ?? null
  }

  return null
}
