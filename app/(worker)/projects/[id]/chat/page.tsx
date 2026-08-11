'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import {
  loadChatHistory, sendChatMessage, parseAIResponse,
  type ChatMessageRow, type ResponseSection,
} from '@/services/chat.service'
import { getTodayJob } from '@/services/jobs.service'
import { WorkerHeader } from '@/components/layouts/WorkerHeader'
import { WELCOME_MESSAGE } from '@/modules/manual-ai/prompts'
import { cn } from '@/lib/utils'
import {
  Send, BookOpen, AlertTriangle, List,
  FileText, Sparkles, Bot,
} from 'lucide-react'

const GOLD    = 'oklch(0.73 0.12 78)'
const WARNING = 'oklch(0.75 0.18 60)'
const SUCCESS = 'oklch(0.72 0.18 150)'

// ============================================================
// AI回答セクション レンダラー
// ============================================================

function SectionBlock({ section }: { section: ResponseSection }) {
  if (!section.content.trim()) return null

  const sectionConfig = {
    answer:     { bg: `${GOLD}0a`,      border: `${GOLD}30`,     icon: Sparkles,      color: GOLD },
    steps:      { bg: 'oklch(0.09 0.005 255 / 0.6)', border: `${GOLD}15`, icon: List,          color: 'oklch(0.90 0.008 75)' },
    caution:    { bg: `${WARNING}15`,   border: `${WARNING}40`,  icon: AlertTriangle, color: WARNING },
    sources:    { bg: `${SUCCESS}12`,   border: `${SUCCESS}30`,  icon: BookOpen,      color: SUCCESS },
    supplement: { bg: 'oklch(0.15 0.005 260)', border: `${GOLD}10`, icon: FileText,      color: 'oklch(0.60 0.008 75)' },
    text:       { bg: 'oklch(0.09 0.005 255 / 0.6)', border: 'transparent', icon: null,          color: 'oklch(0.90 0.008 75)' },
  }

  const config = sectionConfig[section.type]
  const Icon = config.icon

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: config.bg, border: `1px solid ${config.border}` }}
    >
      {section.title && Icon && (
        <div className="flex items-center gap-1.5 mb-1.5" style={{ color: config.color }}>
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs font-semibold">{section.title}</span>
        </div>
      )}
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'oklch(0.92 0.008 75)' }}>{section.content}</p>
    </div>
  )
}

// ============================================================
// メッセージバブル
// ============================================================

function MessageBubble({
  message,
  isStreaming,
}: {
  message: ChatMessageRow & { streamingContent?: string }
  isStreaming?: boolean
}) {
  const isUser = message.role === 'user'
  const content = isStreaming ? (message.streamingContent ?? '') : message.content

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed"
          style={{ background: GOLD, color: 'oklch(0.06 0.003 260)' }}
        >
          {content}
        </div>
      </div>
    )
  }

  const sections = parseAIResponse(content)

  return (
    <div className="flex gap-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-1"
        style={{ background: GOLD, color: 'oklch(0.06 0.003 260)' }}
      >
        <Bot className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0 space-y-2">
        {sections.map((s, i) => (
          <SectionBlock key={i} section={s} />
        ))}
        {isStreaming && !content && (
          <div className="flex gap-1 items-center px-3 py-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full animate-bounce"
                style={{ background: 'oklch(0.55 0.007 75)', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
        {message.sources && message.sources.length > 0 && !isStreaming && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.sources.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
                style={{ background: 'oklch(0.15 0.005 260)', color: 'oklch(0.75 0.008 75)' }}
              >
                <BookOpen className="h-2.5 w-2.5" />
                {s}
              </span>
            ))}
          </div>
        )}
        <p className="text-[10px] pl-1" style={{ color: 'oklch(0.45 0.006 75)' }}>
          {new Date(message.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// ウェルカムメッセージ
// ============================================================

function WelcomeMessage() {
  return (
    <div className="flex gap-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-1"
        style={{ background: GOLD, color: 'oklch(0.06 0.003 260)' }}
      >
        <Bot className="h-4 w-4" />
      </span>
      <div
        className="flex-1 rounded-2xl rounded-bl-md px-4 py-3"
        style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: `1px solid ${GOLD}15` }}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'oklch(0.90 0.008 75)' }}>
          {WELCOME_MESSAGE}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// メインページ
// ============================================================

const QUICK_QUESTIONS = [
  '清掃手順を教えてください',
  '注意事項はありますか？',
  '使用できる洗剤は？',
  '厨房の清掃方法は？',
]

export default function ChatPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [messages, setMessages] = React.useState<(ChatMessageRow & { streamingContent?: string })[]>([])
  const [input, setInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [projectName, setProjectName] = React.useState('')
  const [jobId, setJobId] = React.useState<string | undefined>()
  const [historyLoaded, setHistoryLoaded] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const inputRef  = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    async function init() {
      // プロジェクト名取得（manuals API のレスポンスから）
      const manRes = await fetch(`/api/projects/${projectId}/manuals`, { credentials: 'include', cache: 'no-store' })
      if (manRes.ok) {
        const j = await manRes.json()
        setProjectName(j.projectName ?? '')
      }

      const job = await getTodayJob(projectId)
      if (job) setJobId(job.id)

      const history = await loadChatHistory(projectId, 30)
      setMessages(history)
      setHistoryLoaded(true)
    }
    init()
  }, [projectId])

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(text?: string) {
    const question = (text ?? input).trim()
    if (!question || isLoading) return

    setInput('')
    setIsLoading(true)

    const userMsg: ChatMessageRow = {
      id:         `temp-user-${Date.now()}`,
      role:       'user',
      content:    question,
      sources:    null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])

    const aiMsgId = `temp-ai-${Date.now()}`
    const aiPlaceholder: ChatMessageRow & { streamingContent: string } = {
      id:               aiMsgId,
      role:             'assistant',
      content:          '',
      streamingContent: '',
      sources:          null,
      created_at:       new Date().toISOString(),
    }
    setMessages((prev) => [...prev, aiPlaceholder])

    const chatHistory = messages.slice(-10).map((m) => ({
      role:    m.role,
      content: m.content,
    }))

    try {
      await sendChatMessage({
        projectId,
        message: question,
        chatHistory,
        jobId,
        callbacks: {
          onChunk: (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? { ...m, streamingContent: (m.streamingContent ?? '') + chunk }
                  : m
              )
            )
          },
          onDone: (sources) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? {
                      ...m,
                      content:          m.streamingContent ?? '',
                      streamingContent: undefined,
                      sources,
                    }
                  : m
              )
            )
            setIsLoading(false)
          },
          onError: (errMsg) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? {
                      ...m,
                      content:          `エラー: ${errMsg}`,
                      streamingContent: undefined,
                    }
                  : m
              )
            )
            setIsLoading(false)
          },
        },
      })
    } catch {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col min-h-dvh">
      <WorkerHeader
        title="AIアシスタント"
        showBack
        rightAction={
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: `${GOLD}12` }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} />
            <span className="text-xs font-medium" style={{ color: GOLD }}>HIKARU AI</span>
          </div>
        }
      />

      {projectName && (
        <div
          className="px-4 py-2 flex items-center gap-2"
          style={{ background: 'oklch(0.07 0.004 255 / 0.6)', borderBottom: `1px solid ${GOLD}12` }}
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" style={{ color: 'oklch(0.55 0.007 75)' }} />
          <span className="text-xs truncate" style={{ color: 'oklch(0.55 0.007 75)' }}>{projectName} のマニュアルを参照中</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-2">
        {!historyLoaded ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <>
            <WelcomeMessage />
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={msg.streamingContent !== undefined}
              />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {historyLoaded && !hasMessages && (
        <div className="px-4 pb-2">
          <p className="text-xs mb-2" style={{ color: 'oklch(0.55 0.007 75)' }}>よく使われる質問</p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="text-left text-xs rounded-xl px-3 py-2.5 disabled:opacity-50"
                style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: `1px solid ${GOLD}15`, color: 'oklch(0.90 0.008 75)' }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="sticky bottom-0 px-4 pt-3 pb-3"
        style={{
          background: 'oklch(0.05 0.003 260 / 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${GOLD}15`,
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="質問を入力してください…"
            rows={1}
            disabled={isLoading}
            className={cn(
              'flex-1 resize-none rounded-2xl px-4 py-3 text-sm',
              'focus:outline-none disabled:opacity-50',
              'max-h-32 overflow-y-auto'
            )}
            style={{
              background: 'oklch(0.09 0.005 255 / 0.82)',
              border: `1px solid ${GOLD}20`,
              color: 'oklch(0.92 0.008 75)',
              height: 'auto',
              minHeight: '48px',
            }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 disabled:cursor-not-allowed"
            style={input.trim() && !isLoading
              ? { background: GOLD, color: 'oklch(0.06 0.003 260)', boxShadow: `0 0 12px ${GOLD}60` }
              : { background: 'oklch(0.15 0.005 260)', color: 'oklch(0.55 0.007 75)' }
            }
            aria-label="送信"
          >
            {isLoading ? (
              <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px]" style={{ color: 'oklch(0.45 0.006 75)' }}>
          Enterで送信 / Shift+Enterで改行
        </p>
      </div>
    </div>
  )
}
