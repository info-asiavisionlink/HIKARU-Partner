'use client'

import * as React from 'react'
import { Bell, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NotificationRow {
  id: string
  title: string
  body: string | null
  type: 'info' | 'warning' | 'error' | 'success'
  is_read: boolean
  created_at: string
}

const GOLD = 'oklch(0.73 0.12 78)'

const typeConfig = {
  info:    { icon: Info,          color: 'oklch(0.73 0.12 78)' },
  warning: { icon: AlertTriangle, color: 'oklch(0.78 0.15 80)'  },
  error:   { icon: AlertCircle,   color: 'oklch(0.65 0.25 27)'  },
  success: { icon: CheckCircle2,  color: 'oklch(0.72 0.18 150)' },
}

export default function NotificationsPage() {
  const [items, setItems] = React.useState<NotificationRow[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)
      setItems((data as NotificationRow[]) ?? [])
      setLoading(false)

      const unread = (data ?? []).filter((n: any) => !n.is_read).map((n: any) => n.id)
      if (unread.length > 0) {
        await supabase.from('notifications').update({ is_read: true }).in('id', unread)
      }
    }
    load()
  }, [])

  return (
    <div>
      <h1 className="text-xl font-bold mb-4" style={{ color: 'oklch(0.92 0.008 75)' }}>通知</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${GOLD}`, borderTopColor: 'transparent' }} />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Bell className="h-12 w-12 opacity-20 mb-3" style={{ color: GOLD }} />
          <p className="text-sm" style={{ color: 'oklch(0.50 0.007 75)' }}>通知はありません</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden divide-y" style={{ background: 'oklch(0.09 0.005 255 / 0.82)', border: `1px solid ${GOLD}18`, divideColor: `${GOLD}10` }}>
          {items.map((n) => {
            const { icon: Icon, color } = typeConfig[n.type] ?? typeConfig.info
            return (
              <div key={n.id} className="flex items-start gap-3 px-4 py-4"
                style={{ background: n.is_read ? 'transparent' : `${GOLD}08` }}>
                <Icon className="h-5 w-5 mt-0.5 shrink-0" style={{ color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'oklch(0.90 0.008 75)', fontWeight: n.is_read ? 400 : 600 }}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-xs" style={{ color: 'oklch(0.55 0.007 75)' }}>{n.body}</p>
                  )}
                  <p className="mt-1 text-[10px]" style={{ color: 'oklch(0.40 0.005 75)' }}>
                    {new Date(n.created_at).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.is_read && <span className="h-2 w-2 rounded-full mt-1.5 shrink-0" style={{ background: GOLD }} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
