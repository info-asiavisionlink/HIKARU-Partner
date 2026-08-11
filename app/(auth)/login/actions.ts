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

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('entity_type, entity_id')
    .eq('id', authData.user.id)
    .single()

  if (!profile || !['employee', 'partner'].includes(profile.entity_type)) {
    await supabase.auth.signOut()
    return { error: 'ワーカーアカウントではありません。管理者へお問い合わせください。' }
  }

  // ステータス確認（employee or partner）
  if (profile.entity_type === 'employee') {
    const { data: employee } = await admin
      .from('employees')
      .select('status')
      .eq('id', profile.entity_id)
      .single()
    if (!employee || employee.status !== 'active') {
      await supabase.auth.signOut()
      return { error: 'このアカウントは現在無効です。管理者へお問い合わせください。' }
    }
  } else {
    const { data: partner } = await admin
      .from('partners')
      .select('status')
      .eq('id', profile.entity_id)
      .single()
    if (!partner || partner.status !== 'active') {
      await supabase.auth.signOut()
      return { error: 'このアカウントは現在無効です。管理者へお問い合わせください。' }
    }
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const maxAge = authData.session.expires_in ?? 3600
  const opts = { httpOnly: true, secure: isProduction, path: '/', maxAge, sameSite: 'lax' } as const

  cookieStore.set('hk_w_role', profile.entity_type, opts)
  cookieStore.set('hk_w_uid',  authData.user.id,    opts)

  redirect('/home')
}

export async function forgotPasswordAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get('email') as string)?.trim()
  if (!email) return { error: 'メールアドレスを入力してください。' }

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
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/reset-password`,
  })
  if (error) return { error: 'メール送信に失敗しました。' }
  return { error: null }
}

export async function resetPasswordAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password        = formData.get('password')        as string
  const confirmPassword = formData.get('confirmPassword') as string
  if (!password || password.length < 8) return { error: 'パスワードは8文字以上で入力してください。' }
  if (password !== confirmPassword)      return { error: 'パスワードが一致しません。' }

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
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: 'パスワードの変更に失敗しました。' }
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
  cookieStore.delete('hk_w_role')
  cookieStore.delete('hk_w_uid')
  redirect('/login')
}

function translateAuthError(message: string): string {
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials'))
    return 'メールアドレスまたはパスワードが正しくありません。'
  if (message.includes('Too many requests'))
    return 'ログイン試行回数が上限に達しました。しばらく待ってから再試行してください。'
  return 'エラーが発生しました。しばらく時間をおいて再試行してください。'
}
