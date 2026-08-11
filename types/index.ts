// HIKARU-Worker スタンドアロン型定義

export type WorkerRole = 'employee' | 'partner'
export type JobStatus = 'in_progress' | 'completed' | 'cancelled'
export type PhotoType = 'before' | 'after'
export type ManualType = 'pdf' | 'image' | 'video' | 'text' | 'faq' | 'note'
export type QualityRecommendation = 'pass' | 'check' | 'redo'

export interface AppUser {
  id: string
  email: string
  name: string
  role: WorkerRole
  entityType: 'employee' | 'partner'
  entityId: string
  companyId?: string
  phone?: string
  avatarUrl?: string
  lastLoginAt?: string
  createdAt: string
}

export interface Job {
  id: string
  projectId: string
  workerId: string
  companyId: string
  status: JobStatus
  workDate: string
  startedAt?: string
  completedAt?: string
  notes?: string
  createdAt: string
}

export interface Photo {
  id: string
  jobId: string
  spotId: string
  photoType: PhotoType
  storagePath: string
  url: string
  createdAt: string
}

export interface Manual {
  id: string
  title: string
  type: ManualType
  content?: string
  url?: string
  createdAt: string
}

export interface AIEvaluation {
  id: string
  jobId: string
  spotId: string
  beforePhotoId?: string
  afterPhotoId?: string
  score: number
  passed: boolean
  recommendation: QualityRecommendation
  comment?: string
  improvements?: string[]
  createdAt: string
}

export interface Report {
  id: string
  jobId: string
  projectId: string
  workerId: string
  companyId: string
  content: Record<string, unknown>
  overallScore?: number
  pdfUrl?: string
  createdAt: string
}

export interface ServiceResult<T> {
  data: T | null
  error: string | null
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

// AI チャット
export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: string[] | null
  image_url: string | null  // AI質問用添付画像URL（Before/After Photoとは別管理）
  created_at: string
}
