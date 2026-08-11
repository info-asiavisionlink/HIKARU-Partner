// ============================================================
// チャットサービス — クライアントサイド専用
// API Routes 経由でサーバーと通信する（cookie 認証）
// ============================================================

export interface ChatMessageRow {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: string[] | null
  image_url: string | null  // AI質問用添付画像URL（Before/After Photoとは別管理）
  created_at: string
}

// ---- SSE ストリーム読み取り用コールバック ----

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onDone: (sources: string[]) => void
  onError: (message: string) => void
}

// チャット履歴取得
export async function loadChatHistory(
  projectId: string,
  limit = 30
): Promise<ChatMessageRow[]> {
  const res = await fetch(
    `/api/ai/manual?projectId=${encodeURIComponent(projectId)}&limit=${limit}`,
    { credentials: 'include', cache: 'no-store' }
  )
  if (!res.ok) return []
  const json = await res.json()
  return json.success ? json.data : []
}

// ============================================================
// AI質問用画像をStorageへアップロードしてURLを取得
// Before/After Photoとは完全に分離した専用エンドポイントを使用
// ============================================================

export async function uploadChatImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)

  const res = await fetch('/api/ai/chat-images', {
    method:      'POST',
    credentials: 'include',
    body:        fd,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? '画像のアップロードに失敗しました')
  }

  const data = await res.json()
  if (!data.success || !data.url) throw new Error('画像URLの取得に失敗しました')
  return data.url
}

// AIへ質問を送り、ストリーミング受信（テキスト・画像両対応）
export async function sendChatMessage(params: {
  projectId: string
  message: string
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
  jobId?: string
  imageUrl?: string  // AI質問用画像URL（アップロード済み）
  callbacks: StreamCallbacks
}): Promise<void> {
  const { projectId, message, chatHistory, jobId, imageUrl, callbacks } = params

  const res = await fetch('/api/ai/manual', {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ projectId, message, chatHistory, jobId, imageUrl }),
  })

  if (!res.ok || !res.body) {
    callbacks.onError('通信に失敗しました。再度お試しください。')
    return
  }

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer    = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // SSEの行を処理
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? '' // 未完の行はバッファに残す

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const data = JSON.parse(line.slice(6))

        switch (data.type) {
          case 'chunk':
            callbacks.onChunk(data.content ?? '')
            break
          case 'done':
            callbacks.onDone(data.sources ?? [])
            break
          case 'error':
            callbacks.onError(data.message ?? 'エラーが発生しました')
            break
        }
      } catch {
        // JSONパースエラーは無視
      }
    }
  }
}

// レスポンスを構造化セクションに分割
export interface ResponseSection {
  type: 'answer' | 'steps' | 'caution' | 'sources' | 'supplement' | 'text'
  title: string
  content: string
}

export function parseAIResponse(content: string): ResponseSection[] {
  const SECTION_MAP: Record<string, ResponseSection['type']> = {
    '回答':          'answer',
    '手順・方法':     'steps',
    '注意事項':       'caution',
    '参照マニュアル': 'sources',
    '補足':          'supplement',
  }

  const sections: ResponseSection[] = []
  const parts = content.split(/(■[^\n]+)/).filter(Boolean)

  let currentType: ResponseSection['type'] = 'text'
  let currentTitle = ''
  let currentContent = ''

  for (const part of parts) {
    if (part.startsWith('■')) {
      if (currentContent.trim()) {
        sections.push({ type: currentType, title: currentTitle, content: currentContent.trim() })
      }
      const title = part.slice(1).trim()
      currentType    = SECTION_MAP[title] ?? 'text'
      currentTitle   = title
      currentContent = ''
    } else {
      currentContent += part
    }
  }

  if (currentContent.trim()) {
    sections.push({ type: currentType, title: currentTitle, content: currentContent.trim() })
  }

  // ■ が一つもない場合はそのまま返す
  if (sections.length === 0 && content.trim()) {
    sections.push({ type: 'text', title: '', content: content.trim() })
  }

  return sections
}
