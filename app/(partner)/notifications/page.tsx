'use client'

import { Bell } from 'lucide-react'

export default function NotificationsPage() {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-bold" style={{ color: 'oklch(0.92 0.008 75)' }}>通知</h1>
      <div className="flex flex-col items-center justify-center py-20">
        <Bell className="h-12 w-12 opacity-20 mb-3" style={{ color: 'oklch(0.73 0.12 78)' }} />
        <p className="text-sm" style={{ color: 'oklch(0.50 0.007 75)' }}>通知はありません</p>
      </div>
    </div>
  )
}
