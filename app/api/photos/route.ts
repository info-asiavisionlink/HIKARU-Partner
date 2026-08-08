import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const BUCKET = 'photos'

function getUid(req: NextRequest) {
  const uid  = req.cookies.get('hk_p_uid')?.value
  const role = req.cookies.get('hk_p_role')?.value
  if (!uid || role !== 'partner') return null
  return uid
}

// ============================================================
// GET  /api/photos?jobId=xxx        — job の写真一覧
// POST /api/photos  (FormData)      — 写真アップロード
// DELETE /api/photos?photoId=xxx    — 写真削除
// ============================================================

export async function GET(req: NextRequest) {
  const uid = getUid(req)
  if (!uid) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })

  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'jobIdが必要です' } }, { status: 400 })

  const admin = createAdminClient()

  // jobアクセス権チェック
  const { data: job } = await admin.from('jobs').select('id').eq('id', jobId).eq('worker_id', uid).maybeSingle()
  if (!job) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'アクセス権がありません' } }, { status: 403 })

  const { data } = await admin
    .from('photos')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })

  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const uid = getUid(req)
  if (!uid) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })

  const fd = await req.formData()
  const file   = fd.get('file')   as File | null
  const jobId  = fd.get('jobId')  as string | null
  const spotId = fd.get('spotId') as string | null
  const type   = fd.get('type')   as string | null

  if (!file || !jobId || !spotId || !type || (type !== 'before' && type !== 'after')) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'パラメータが不正です' } }, { status: 400 })
  }

  const admin = createAdminClient()

  // jobアクセス権チェック
  const { data: job } = await admin.from('jobs').select('id').eq('id', jobId).eq('worker_id', uid).maybeSingle()
  if (!job) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'アクセス権がありません' } }, { status: 403 })

  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${jobId}/${type}/${spotId}_${Date.now()}.${ext}`

  // Upload
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ success: false, error: { code: 'UPLOAD_ERROR', message: uploadError.message } }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

  // Upsert
  const { data, error } = await admin
    .from('photos')
    .upsert(
      {
        job_id:       jobId,
        spot_id:      spotId,
        photo_type:   type,
        storage_path: path,
        url:          publicUrl,
      },
      { onConflict: 'job_id,spot_id,photo_type' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  }
  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  const uid = getUid(req)
  if (!uid) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })

  const photoId = req.nextUrl.searchParams.get('photoId')
  if (!photoId) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'photoIdが必要です' } }, { status: 400 })

  const admin = createAdminClient()

  // 所有者チェック
  const { data: photo } = await admin
    .from('photos')
    .select('storage_path, job_id')
    .eq('id', photoId)
    .single()

  if (!photo) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: '写真が見つかりません' } }, { status: 404 })

  const { data: job } = await admin.from('jobs').select('id').eq('id', photo.job_id).eq('worker_id', uid).maybeSingle()
  if (!job) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'アクセス権がありません' } }, { status: 403 })

  if (photo.storage_path) {
    await admin.storage.from(BUCKET).remove([photo.storage_path])
  }

  const { error } = await admin.from('photos').delete().eq('id', photoId)
  if (error) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
