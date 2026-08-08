'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { resetPasswordAction } from '../login/actions'

const GOLD = 'oklch(0.73 0.12 78)'
const SURFACE = 'oklch(0.10 0.005 255 / 0.85)'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
      style={{
        background: pending ? `${GOLD}20` : `linear-gradient(135deg, oklch(0.52 0.10 75) 0%, ${GOLD} 50%, oklch(0.88 0.13 78) 100%)`,
        color: 'oklch(0.08 0.005 60)',
        boxShadow: pending ? 'none' : `0 0 20px ${GOLD}4d`,
      }}>
      {pending
        ? <span className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: `${GOLD} transparent transparent transparent` }} />
        : <KeyRound className="h-4 w-4" />}
      {pending ? '更新中...' : 'パスワードを更新'}
    </button>
  )
}

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState(resetPasswordAction, { error: null })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: 'oklch(0.05 0.003 260)' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black"
            style={{ background: `linear-gradient(135deg, oklch(0.52 0.10 75), ${GOLD})`, boxShadow: `0 0 32px ${GOLD}35`, color: 'oklch(0.08 0.005 60)' }}>
            H
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold" style={{ color: 'oklch(0.88 0.008 75)' }}>新しいパスワードを設定</h1>
            <p className="text-sm mt-0.5" style={{ color: 'oklch(0.50 0.007 75)' }}>8文字以上のパスワードを設定してください</p>
          </div>
        </div>

        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'oklch(0.09 0.005 255 / 0.85)', border: `1px solid ${GOLD}20` }}>
          {state.error && (
            <div className="rounded-xl p-3 text-sm" style={{ background: 'oklch(0.65 0.25 27 / 0.12)', border: '1px solid oklch(0.65 0.25 27 / 0.35)', color: 'oklch(0.78 0.18 30)' }}>
              {state.error}
            </div>
          )}
          <form action={formAction} className="space-y-4">
            {[
              { name: 'password', label: '新しいパスワード', show: showPw, toggle: () => setShowPw(p => !p) },
              { name: 'confirmPassword', label: 'パスワードの確認', show: showConfirm, toggle: () => setShowConfirm(p => !p) },
            ].map(({ name, label, show, toggle }) => (
              <div key={name} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'oklch(0.55 0.008 60)' }}>{label}</label>
                <div className="relative">
                  <input name={name} type={show ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password" required
                    className="w-full px-4 pr-12 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: SURFACE, border: `1px solid ${GOLD}30`, color: 'oklch(0.88 0.006 60)' }} />
                  <button type="button" onClick={toggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: 'oklch(0.50 0.007 75)' }}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
            <SubmitButton />
          </form>
        </div>
      </div>
    </div>
  )
}
