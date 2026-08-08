// ============================================================
// Photos サービス — クライアントサイド専用
// アップロードは API Route 経由（cookie 認証）
// ============================================================

export interface PhotoRow {
  id: string
  job_id: string
  spot_id: string | null
  photo_type: 'before' | 'after'
  storage_path: string
  url: string | null
  created_at: string
}

export async function uploadPhoto(
  jobId: string,
  spotId: string,
  type: 'before' | 'after',
  file: File
): Promise<PhotoRow | null> {
  const fd = new FormData()
  fd.append('file',    file)
  fd.append('jobId',   jobId)
  fd.append('spotId',  spotId)
  fd.append('type',    type)

  const res = await fetch('/api/photos', {
    method: 'POST',
    credentials: 'include',
    body: fd,
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.success ? (json.data as PhotoRow) : null
}

export async function getJobPhotos(jobId: string): Promise<PhotoRow[]> {
  const res = await fetch(`/api/photos?jobId=${encodeURIComponent(jobId)}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.success ? (json.data as PhotoRow[]) : []
}

export async function getSpotPhoto(
  jobId: string,
  spotId: string,
  type: 'before' | 'after'
): Promise<PhotoRow | null> {
  const list = await getJobPhotos(jobId)
  return list.find((p) => p.spot_id === spotId && p.photo_type === type) ?? null
}

export async function deletePhoto(photoId: string): Promise<boolean> {
  const res = await fetch(`/api/photos?photoId=${encodeURIComponent(photoId)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) return false
  const json = await res.json()
  return !!json.success
}
