import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  generateManualReplyStream,
  extractSources,
  type ManualItem,
  type ChatMessage,
} from '@/modules/manual-ai'

function getUid(req: NextRequest) {
  const uid  = req.cookies.get('hk_p_uid')?.value
  const role = req.cookies.get('hk_p_role')?.value
  if (!uid || role !== 'partner') return null
  return uid
}

// ============================================================
// POST /api/ai/manual — SSEストリーミングでAI回答を返す
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
      const body = await req.json()
      const {
        projectId,
        message,
        chatHistory = [],
        jobId,
      } = body as {
        projectId: string
        message: string
        chatHistory: ChatMessage[]
        jobId?: string
      }

      if (!projectId || !message?.trim()) {
        await writer.write(send({ type: 'error', message: 'パラメータが不正です' }))
        return
      }

      // ---- マニュアル取得 ----
      const { data: manuals } = await admin
        .from('manuals')
        .select('id, type, title, content, file_url')
        .eq('project_id', projectId)
        .order('order_num', { ascending: true })

      const manualItems = (manuals ?? []) as ManualItem[]

      // ---- ユーザーメッセージ保存 ----
      await admin.from('chat_messages').insert({
        project_id: projectId,
        worker_id:  uid,
        job_id:     jobId ?? null,
        role:       'user',
        content:    message.trim(),
        sources:    [],
      })

      // ---- ストリーミング ----
      let fullContent = ''
      await writer.write(send({ type: 'start' }))

      for await (const chunk of generateManualReplyStream(message.trim(), chatHistory, manualItems)) {
        fullContent += chunk
        await writer.write(send({ type: 'chunk', content: chunk }))
      }

      // ---- 保存・完了 ----
      const sources = extractSources(fullContent, manualItems)

      await admin.from('chat_messages').insert({
        project_id: projectId,
        worker_id:  uid,
        job_id:     jobId ?? null,
        role:       'assistant',
        content:    fullContent,
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
  if (!uid) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const limit     = Math.min(Number(searchParams.get('limit') ?? '30'), 100)

  if (!projectId) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'projectIdが必要です' } }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('chat_messages')
    .select('id, role, content, sources, created_at')
    .eq('project_id', projectId)
    .eq('worker_id', uid)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: (data ?? []).reverse() })
}
