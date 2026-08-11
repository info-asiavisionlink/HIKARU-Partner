import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const BUCKET = 'photos'
// AI質問画像のStorageパス（Before/Afterとは分離: {jobId}/{type}/... とは別構造）
// path: chat/{worker_uid}/{timestamp}.{ext}

function getUid(req: NextRequest) {
  const uid  = req.cookies.get('hk_w_uid')?.value
  const role = req.cookies.get('hk_w_role')?.value
  if (!uid || !['employee', 'partner'].includes(role ?? '')) return null
  return uid
}

// ============================================================
// POST /api/ai/chat-images
// AI質問用画像をStorageへアップロードし、public URLを返す
// Before/After Photoとは完全に分離した専用エンドポイント
// ============================================================

export async function POST(req: NextRequest) {
  const uid = getUid(req)
  if (!uid) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
      { status: 401 }
    )
  }

  const fd   = await req.formData()
  const file = fd.get('file') as File | null

  if (!file) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'ファイルが必要です' } },
      { status: 400 }
    )
  }

  // 画像ファイルのみ許可
  if (!file.type.startsWith('image/')) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: '画像ファイルのみアップロード可能です' } },
      { status: 400 }
    )
  }

  // サイズ制限: 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'ファイルサイズは10MB以下にしてください' } },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // Storage path: chat/{worker_uid}/{timestamp}.{ext}
  // photosテーブルのパス ({jobId}/{type}/...) とは明確に異なる構造
  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `chat/${uid}/${Date.now()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType:  file.type || 'image/jpeg',
      cacheControl: '3600',
      upsert:       false,
    })

  if (uploadError) {
    return NextResponse.json(
      { success: false, error: { code: 'UPLOAD_ERROR', message: uploadError.message } },
      { status: 500 }
    )
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ success: true, url: publicUrl, path })
}
