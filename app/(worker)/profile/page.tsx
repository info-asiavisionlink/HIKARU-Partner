'use client'

import * as React from 'react'
import { logoutAction } from '@/app/(auth)/login/actions'
import { LogOut, Building2, Mail, Phone, User, Shield } from 'lucide-react'

const GOLD = 'oklch(0.73 0.12 78)'

export default function ProfilePage() {
  const [profile, setProfile] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProfile(d.user) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const initial = profile?.partner?.company_name?.slice(0, 2) ?? profile?.name?.slice(0, 2) ?? 'HP'

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-bold" style={{ color: 'oklch(0.92 0.008 75)' }}>プロフィール</h1>

      {/* アバター・会社名 */}
      <div className="rounded-2xl p-6 flex flex-col items-center gap-3"
        style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: `1px solid ${GOLD}20` }}>
        <div className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold"
          style={{ background: `${GOLD}15`, border: `2px solid ${GOLD}40`, color: GOLD }}>
          {initial}
        </div>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'oklch(0.92 0.008 75)' }}>
            {profile?.partner?.company_name ?? profile?.name ?? '—'}
          </p>
          <span className="inline-block mt-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ background: `${GOLD}15`, color: GOLD }}>
            協力会社
          </span>
        </div>
      </div>

      {/* 情報リスト */}
      <div className="rounded-2xl overflow-hidden divide-y"
        style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: `1px solid ${GOLD}18` }}>
        {[
          { icon: User,     label: '担当者名',       value: profile?.name },
          { icon: Mail,     label: 'メールアドレス',   value: profile?.email },
          { icon: Building2, label: '会社名',         value: profile?.partner?.company_name },
          { icon: Shield,   label: 'アカウント種別',   value: '協力会社' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3.5">
            <Icon className="h-4 w-4 shrink-0" style={{ color: 'oklch(0.50 0.007 75)' }} />
            <div className="flex-1">
              <p className="text-xs" style={{ color: 'oklch(0.50 0.007 75)' }}>{label}</p>
              <p className="text-sm mt-0.5" style={{ color: 'oklch(0.88 0.008 75)' }}>{value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ログアウト */}
      <form action={logoutAction}>
        <button type="submit"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base transition-all"
          style={{ background: 'oklch(0.65 0.25 27 / 0.10)', border: '1px solid oklch(0.65 0.25 27 / 0.30)', color: 'oklch(0.78 0.18 30)' }}>
          <LogOut className="h-5 w-5" /> ログアウト
        </button>
      </form>
    </div>
  )
}
