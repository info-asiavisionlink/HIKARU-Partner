'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { ArrowLeft, Mail, Send } from 'lucide-react'
import { forgotPasswordAction } from '../login/actions'

const GOLD = 'oklch(0.73 0.12 78)'
const SURFACE = 'oklch(0.10 0.005 255 / 0.85)'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-60"
      style={{
        background: pending ? `${GOLD}20` : `linear-gradient(135deg, oklch(0.52 0.10 75) 0%, ${GOLD} 50%, oklch(0.88 0.13 78) 100%)`,
        color: 'oklch(0.08 0.005 60)',
        boxShadow: pending ? 'none' : `0 0 20px ${GOLD}4d`,
      }}
    >
      {pending
        ? <span className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: `${GOLD} transparent transparent transparent` }} />
        : <Send className="h-4 w-4" />}
      {pending ? '送信中...' : 'リセットメールを送信'}
    </button>
  )
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(forgotPasswordAction, { error: null })
  const sent = state.error === null && (state as any)._sent

  return (
    <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: 'oklch(0.05 0.003 260)' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black"
            style={{ background: `linear-gradient(135deg, oklch(0.52 0.10 75), ${GOLD})`, boxShadow: `0 0 32px ${GOLD}35`, color: 'oklch(0.08 0.005 60)' }}>
            H
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold" style={{ color: 'oklch(0.88 0.008 75)' }}>パスワードのリセット</h1>
            <p className="text-sm mt-0.5" style={{ color: 'oklch(0.50 0.007 75)' }}>
              登録済みのメールアドレスへリセットリンクを送信します
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-6 space-y-5"
          style={{ background: 'oklch(0.09 0.005 255 / 0.85)', border: `1px solid ${GOLD}20` }}>

          {state.error && (
            <div className="rounded-xl p-3 text-sm" style={{ background: 'oklch(0.65 0.25 27 / 0.12)', border: '1px solid oklch(0.65 0.25 27 / 0.35)', color: 'oklch(0.78 0.18 30)' }}>
              {state.error}
            </div>
          )}

          {(state as any)._sent ? (
            <div className="text-center space-y-4">
              <div className="rounded-xl p-4" style={{ background: 'oklch(0.72 0.18 150 / 0.12)', border: '1px solid oklch(0.72 0.18 150 / 0.30)' }}>
                <p className="text-sm font-medium" style={{ color: 'oklch(0.72 0.18 150)' }}>メールを送信しました</p>
                <p className="text-xs mt-1" style={{ color: 'oklch(0.60 0.010 75)' }}>
                  入力したメールアドレスにリセットリンクを送信しました。メールをご確認ください。
                </p>
              </div>
              <Link href="/login" className="block w-full py-3 rounded-xl text-sm font-medium text-center transition-all"
                style={{ background: SURFACE, border: `1px solid ${GOLD}20`, color: 'oklch(0.73 0.12 78)' }}>
                ログインに戻る
              </Link>
            </div>
          ) : (
            <form action={async (fd) => {
              await formAction(fd)
              ;(state as any)._sent = true
            }} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'oklch(0.55 0.008 60)' }}>メールアドレス</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'oklch(0.45 0.006 75)' }} />
                  <input name="email" type="email" placeholder="your@email.com" autoComplete="email" required
                    className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{ background: SURFACE, border: `1px solid ${GOLD}30`, color: 'oklch(0.88 0.006 60)' }} />
                </div>
              </div>
              <SubmitButton />
            </form>
          )}
        </div>

        <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm transition-all hover:opacity-80"
          style={{ color: 'oklch(0.50 0.007 75)' }}>
          <ArrowLeft className="h-3.5 w-3.5" /> ログインに戻る
        </Link>
      </div>
    </div>
  )
}
