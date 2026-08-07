import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const uid = req.cookies.get('hk_p_uid')?.value
  if (!uid) return NextResponse.json({ user: null }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, email, entity_type, entity_id')
    .eq('id', uid)
    .single()

  if (!profile) return NextResponse.json({ user: null }, { status: 401 })

  const { data: partner } = await admin
    .from('partners')
    .select('id, company_name, status')
    .eq('id', profile.entity_id)
    .single()

  return NextResponse.json({ user: { ...profile, partner } })
}
