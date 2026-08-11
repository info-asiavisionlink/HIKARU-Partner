import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const uid  = req.cookies.get('hk_w_uid')?.value
  const role = req.cookies.get('hk_w_role')?.value

  if (!uid || !['employee', 'partner'].includes(role ?? '')) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, email, entity_type, entity_id')
    .eq('id', uid)
    .single()

  if (!profile) return NextResponse.json({ user: null }, { status: 401 })

  let entityData: any = null
  if (profile.entity_type === 'employee') {
    const { data } = await admin
      .from('employees')
      .select('id, employee_number, department, position, status')
      .eq('id', profile.entity_id)
      .single()
    entityData = data
  } else if (profile.entity_type === 'partner') {
    const { data } = await admin
      .from('partners')
      .select('id, company_name, status')
      .eq('id', profile.entity_id)
      .single()
    entityData = data
  }

  return NextResponse.json({ user: { ...profile, entityData } })
}
