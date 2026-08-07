'use client'

import * as React from 'react'
import { Sidebar } from './Sidebar'
import { Menu } from 'lucide-react'

const GOLD = 'oklch(0.73 0.12 78)'

interface PartnerLayoutClientProps {
  children: React.ReactNode
}

export function PartnerLayoutClient({ children }: PartnerLayoutClientProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [isMd, setIsMd] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsMd(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const sidebarPx = collapsed ? 60 : 240

  return (
    <>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((p) => !p)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* モバイルヘッダー（ハンバーガーメニュー） */}
      {!isMd && (
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '56px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '12px',
            background: 'oklch(0.07 0.004 255 / 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${GOLD}1f`,
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            style={{ padding: '6px', borderRadius: '8px', color: `${GOLD}cc`, background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="メニューを開く"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                height: '28px',
                width: '28px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, oklch(0.52 0.10 75) 0%, oklch(0.73 0.12 78) 50%, oklch(0.88 0.13 78) 100%)',
                boxShadow: `0 0 10px ${GOLD}60`,
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 900, color: 'oklch(0.06 0.003 260)' }}>H</span>
            </div>
            <span style={{
              fontSize: '14px',
              fontWeight: 900,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              background: `linear-gradient(135deg, oklch(0.62 0.11 75), oklch(0.88 0.13 78))`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              HIKARU
            </span>
            <span style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: `${GOLD}70` }}>
              Partner
            </span>
          </div>
        </header>
      )}

      {/* メインコンテンツ */}
      <main
        style={{
          minHeight: '100dvh',
          paddingTop: isMd ? 0 : '56px',
          paddingLeft: isMd ? `${sidebarPx}px` : 0,
          transition: 'padding-left 0.3s',
        }}
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </>
  )
}
