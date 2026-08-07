'use client'

import { Bell } from 'lucide-react'
import { PartnerHeader } from '@/components/layouts/PartnerHeader'

export default function NotificationsPage() {
  return (
    <div className="min-h-dvh">
      <PartnerHeader title="通知" />
      <div className="flex flex-col items-center justify-center py-20">
        <Bell className="h-12 w-12 opacity-20 mb-3" style={{ color: 'oklch(0.73 0.12 78)' }} />
        <p className="text-sm" style={{ color: 'oklch(0.50 0.007 75)' }}>通知はありません</p>
      </div>
    </div>
  )
}
