'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'

interface LoginState {
  error: string | null
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email    = (formData.get('email')    as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください。' }
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

  if (authError || !authData.session) {
    return { error: translateAuthError(authError?.message ?? '') }
  }

  // entity_type が partner であることを確認
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('entity_type, entity_id')
    .eq('id', authData.user.id)
    .single()

  if (!profile || profile.entity_type !== 'partner') {
    await supabase.auth.signOut()
    return { error: '協力会社のアカウントではありません。管理者へお問い合わせください。' }
  }

  // 協力業者のステータスを確認
  const { data: partner } = await admin
    .from('partners')
    .select('status')
    .eq('id', profile.entity_id)
    .single()

  if (!partner || partner.status !== 'active') {
    await supabase.auth.signOut()
    return { error: 'このアカウントは現在無効です。管理者へお問い合わせください。' }
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const maxAge = authData.session.expires_in ?? 3600
  const opts = { httpOnly: true, secure: isProduction, path: '/', maxAge, sameSite: 'lax' } as const

  cookieStore.set('hk_p_role', 'partner',          opts)
  cookieStore.set('hk_p_uid',  authData.user.id,   opts)

  redirect('/home')
}

export async function logoutAction() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )
  await supabase.auth.signOut()
  cookieStore.delete('hk_p_role')
  cookieStore.delete('hk_p_uid')
  redirect('/login')
}

function translateAuthError(message: string): string {
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials'))
    return 'メールアドレスまたはパスワードが正しくありません。'
  if (message.includes('Too many requests'))
    return 'ログイン試行回数が上限に達しました。しばらく待ってから再試行してください。'
  return 'エラーが発生しました。しばらく時間をおいて再試行してください。'
}
