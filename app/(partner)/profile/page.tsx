'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { PartnerHeader } from '@/components/layouts/PartnerHeader'
import { logoutAction } from '@/app/(auth)/login/actions'
import { LogOut, Building2, Mail, User } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = React.useState<any>(null)

  React.useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setProfile(d.user))
  }, [])

  return (
    <div className="min-h-dvh">
      <PartnerHeader title="プロフィール" />
      <div className="px-4 py-5 space-y-4">

        {/* 会社情報 */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: '1px solid oklch(0.73 0.12 78 / 0.18)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'oklch(0.73 0.12 78 / 0.15)', border: '1px solid oklch(0.73 0.12 78 / 0.30)' }}>
              <Building2 className="h-7 w-7" style={{ color: 'oklch(0.73 0.12 78)' }} />
            </div>
            <div>
              <p className="font-bold text-base" style={{ color: 'oklch(0.92 0.008 75)' }}>
                {profile?.partner?.company_name ?? '—'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0.007 75)' }}>協力会社</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'oklch(0.73 0.12 78 / 0.10)' }}>
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 shrink-0" style={{ color: 'oklch(0.55 0.007 75)' }} />
              <div>
                <p className="text-xs" style={{ color: 'oklch(0.55 0.007 75)' }}>担当者名</p>
                <p className="text-sm" style={{ color: 'oklch(0.88 0.008 75)' }}>{profile?.name ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0" style={{ color: 'oklch(0.55 0.007 75)' }} />
              <div>
                <p className="text-xs" style={{ color: 'oklch(0.55 0.007 75)' }}>メールアドレス</p>
                <p className="text-sm" style={{ color: 'oklch(0.88 0.008 75)' }}>{profile?.email ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ログアウト */}
        <form action={logoutAction}>
          <button type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all"
            style={{ background: 'oklch(0.65 0.25 27 / 0.10)', border: '1px solid oklch(0.65 0.25 27 / 0.30)', color: 'oklch(0.78 0.18 30)' }}>
            <LogOut className="h-4 w-4" /> ログアウト
          </button>
        </form>
      </div>
    </div>
  )
}
