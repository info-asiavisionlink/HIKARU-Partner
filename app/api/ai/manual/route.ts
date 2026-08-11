import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  generateManualReplyStream,
  generateManualReplyStreamWithImage,
  extractSources,
  type ManualItem,
  type ChatMessage,
} from '@/modules/manual-ai'
import {
  searchManuals,
  getWorkerCompanyId,
} from '@/services/manual-search.service'

function getUid(req: NextRequest) {
  const uid  = req.cookies.get('hk_w_uid')?.value
  const role = req.cookies.get('hk_w_role')?.value
  if (!uid || !['employee', 'partner'].includes(role ?? '')) return null
  return uid
}

// ============================================================
// POST /api/ai/manual — SSEストリーミングでAI回答を返す
// テキストのみ・画像付き両対応
// ============================================================

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  function send(data: object): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()

  const uid = getUid(req)

  ;(async () => {
    try {
      if (!uid) {
        await writer.write(send({ type: 'error', message: '認証が必要です' }))
        return
      }

      const admin = createAdminClient()
      const body  = await req.json()
      const {
        projectId,
        message,
        chatHistory = [],
        jobId,
        imageUrl,   // AI質問用画像URL（Before/After Photoとは別）
      } = body as {
        projectId:   string
        message:     string
        chatHistory: ChatMessage[]
        jobId?:      string
        imageUrl?:   string
      }

      if (!projectId) {
        await writer.write(send({ type: 'error', message: 'projectIdが必要です' }))
        return
      }
      if (!message?.trim() && !imageUrl) {
        await writer.write(send({ type: 'error', message: '質問文または画像が必要です' }))
        return
      }

      // ---- ownership確認: workerがこのprojectにassignされているか ----
      const { data: profile } = await admin
        .from('profiles')
        .select('entity_type, entity_id')
        .eq('id', uid)
        .single()

      if (!profile || !['employee', 'partner'].includes(profile.entity_type)) {
        await writer.write(send({ type: 'error', message: '権限がありません' }))
        return
      }

      const { data: assignment } = await admin
        .from('project_assignments')
        .select('project_id')
        .eq('project_id', projectId)
        .eq('assignee_type', profile.entity_type)
        .eq('assignee_id', profile.entity_id)
        .maybeSingle()

      if (!assignment) {
        await writer.write(send({ type: 'error', message: 'このプロジェクトへのアクセス権がありません' }))
        return
      }

      // ---- company_id取得（マニュアル検索のテナント分離に必須） ----
      const companyId = await getWorkerCompanyId(admin, uid)
      if (!companyId) {
        await writer.write(send({ type: 'error', message: 'company情報が取得できません' }))
        return
      }

      // ---- マニュアル検索（Project → Company 優先順位で取得） ----
      const manualResults = await searchManuals({ adminClient: admin, projectId, companyId })
      const manualItems: ManualItem[] = manualResults.map((m) => ({
        id:       m.id,
        type:     m.type as ManualItem['type'],
        title:    m.title,
        content:  m.content,
        file_url: m.file_url,
      }))

      // ---- ユーザーメッセージ保存 ----
      await admin.from('chat_messages').insert({
        project_id: projectId,
        worker_id:  uid,
        job_id:     jobId ?? null,
        role:       'user',
        content:    message?.trim() || '（写真を添付して質問）',
        image_url:  imageUrl ?? null,
        sources:    [],
      })

      // ---- ストリーミング ----
      let fullContent = ''
      await writer.write(send({ type: 'start' }))

      // 画像付き: Vision API / テキストのみ: 通常API
      const stream = imageUrl
        ? generateManualReplyStreamWithImage(message?.trim() || '', imageUrl, chatHistory, manualItems)
        : generateManualReplyStream(message.trim(), chatHistory, manualItems)

      for await (const chunk of stream) {
        fullContent += chunk
        await writer.write(send({ type: 'chunk', content: chunk }))
      }

      // ---- AI回答保存・完了 ----
      const sources = extractSources(fullContent, manualItems)

      await admin.from('chat_messages').insert({
        project_id: projectId,
        worker_id:  uid,
        job_id:     jobId ?? null,
        role:       'assistant',
        content:    fullContent,
        image_url:  null,
        sources,
      })

      await writer.write(send({ type: 'done', sources }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI回答の生成に失敗しました'
      await writer.write(send({ type: 'error', message: msg }))
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection:      'keep-alive',
    },
  })
}

// ============================================================
// GET /api/ai/manual?projectId=xxx&limit=30 — 履歴取得
// ============================================================

export async function GET(req: NextRequest) {
  const uid = getUid(req)
  if (!uid) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const limit     = Math.min(Number(searchParams.get('limit') ?? '30'), 100)

  if (!projectId) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'projectIdが必要です' } },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('chat_messages')
    .select('id, role, content, sources, image_url, created_at')
    .eq('project_id', projectId)
    .eq('worker_id', uid)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
  return NextResponse.json({ success: true, data: (data ?? []).reverse() })
}
