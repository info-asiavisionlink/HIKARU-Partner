'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FolderOpen, Calendar, User, ChevronLeft, ChevronRight, X,
} from 'lucide-react'

type IconComponent = React.ComponentType<{ className?: string; style?: React.CSSProperties }>

interface NavChild { label: string; href: string }
interface NavItem  { label: string; href: string; icon: IconComponent; children?: NavChild[] }

const navItems: NavItem[] = [
  { label: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  {
    label: '案件管理',
    href: '/projects',
    icon: FolderOpen,
    children: [
      { label: '全案件',     href: '/projects' },
      { label: '単発案件',   href: '/projects/spot' },
      { label: '定期案件',   href: '/projects/recurring' },
      { label: 'ホテル案件', href: '/projects/hotel' },
    ],
  },
  { label: 'スケジュール', href: '/schedule', icon: Calendar },
  { label: 'プロフィール', href: '/profile',  icon: User },
]

const GOLD = 'oklch(0.73 0.12 78)'

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname()

  // モバイル: ページ遷移時に自動で閉じる
  React.useEffect(() => {
    onMobileClose?.()
  }, [pathname]) // eslint-disable-line

  function isGroupActive(item: NavItem) {
    return pathname.startsWith(item.href)
  }

  function isChildActive(href: string) {
    if (href === '/projects') return pathname === '/projects' || pathname === '/projects/'
    return pathname.startsWith(href)
  }

  const sidebarWidth = collapsed ? 60 : 240

  return (
    <>
      {/* サイドバー本体 */}
      <aside
        className={[
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
        ].join(' ')}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100%',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          width: `${sidebarWidth}px`,
          background: 'oklch(0.04 0.002 260)',
          borderRight: `1px solid ${GOLD}26`,
          transition: 'width 0.3s, transform 0.3s',
        }}
      >
        {/* ロゴエリア */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '56px',
            padding: '0 16px',
            gap: collapsed ? 0 : '12px',
            borderBottom: `1px solid ${GOLD}1f`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              height: '36px',
              width: '36px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              flexShrink: 0,
              background: 'linear-gradient(135deg, oklch(0.52 0.10 75) 0%, oklch(0.73 0.12 78) 50%, oklch(0.88 0.13 78) 100%)',
              boxShadow: `0 0 16px ${GOLD}80`,
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 900, color: 'oklch(0.06 0.003 260)', letterSpacing: '-0.02em' }}>H</span>
          </div>
          {!collapsed && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  background: `linear-gradient(135deg, oklch(0.62 0.11 75), oklch(0.88 0.13 78), ${GOLD})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  HIKARU
                </span>
                <span style={{ fontSize: '8px', letterSpacing: '0.25em', textTransform: 'uppercase', color: `${GOLD}80` }}>
                  Partner
                </span>
              </div>
              {/* モバイル: 閉じるボタン */}
              {onMobileClose && (
                <button
                  onClick={onMobileClose}
                  className="md:hidden"
                  style={{ marginLeft: 'auto', padding: '6px', borderRadius: '6px', color: `${GOLD}80`, background: 'none', border: 'none', cursor: 'pointer' }}
                  aria-label="メニューを閉じる"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* ナビゲーション */}
        <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto', overflowX: 'hidden' }}>
          {!collapsed && (
            <p style={{ padding: '0 16px', marginBottom: '8px', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', color: `${GOLD}59` }}>
              Navigation
            </p>
          )}
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px', margin: 0, listStyle: 'none' }}>
            {navItems.map((item) => {
              const Icon = item.icon

              if (item.children && !collapsed) {
                const groupActive = isGroupActive(item)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        textDecoration: 'none',
                        ...(groupActive ? {
                          background: `linear-gradient(90deg, ${GOLD}1f, transparent)`,
                          color: 'oklch(0.82 0.13 78)',
                          borderLeft: `2px solid ${GOLD}cc`,
                          marginLeft: '-2px',
                        } : { color: 'oklch(0.55 0.008 75)' }),
                      }}
                    >
                      <Icon className="h-4 w-4" style={{ flexShrink: 0, ...(groupActive ? { filter: `drop-shadow(0 0 4px ${GOLD}cc)` } : {}) }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                      {groupActive && (
                        <span style={{ marginLeft: 'auto', height: '6px', width: '6px', borderRadius: '9999px', background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
                      )}
                    </Link>
                    <ul style={{ marginLeft: '28px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: `1px solid ${GOLD}22`, paddingLeft: '12px', listStyle: 'none' }}>
                      {item.children.map((child) => {
                        const childActive = isChildActive(child.href)
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              style={{
                                display: 'block',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                transition: 'all 0.15s',
                                textDecoration: 'none',
                                ...(childActive ? {
                                  background: `${GOLD}18`,
                                  color: 'oklch(0.82 0.13 78)',
                                } : { color: 'oklch(0.50 0.007 75)' }),
                              }}
                            >
                              {child.label}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                )
              }

              const isActive = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: collapsed ? 0 : '12px',
                      justifyContent: collapsed ? 'center' : undefined,
                      borderRadius: '8px',
                      padding: collapsed ? '10px 8px' : '10px 12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      textDecoration: 'none',
                      position: 'relative',
                      ...(isActive ? {
                        background: `linear-gradient(90deg, ${GOLD}1f, transparent)`,
                        color: 'oklch(0.82 0.13 78)',
                        borderLeft: collapsed ? 'none' : `2px solid ${GOLD}cc`,
                        marginLeft: collapsed ? 0 : '-2px',
                      } : { color: 'oklch(0.55 0.008 75)' }),
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4" style={{ flexShrink: 0, ...(isActive ? { filter: `drop-shadow(0 0 4px ${GOLD}cc)` } : {}) }} />
                    {!collapsed && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    )}
                    {isActive && !collapsed && (
                      <span style={{ position: 'absolute', right: '10px', height: '6px', width: '6px', borderRadius: '9999px', background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* 折り畳みボタン（デスクトップのみ） */}
        {onToggleCollapse && (
          <div className="hidden md:block" style={{ padding: '12px 8px', borderTop: `1px solid ${GOLD}1a` }}>
            <button
              onClick={onToggleCollapse}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : '12px',
                justifyContent: collapsed ? 'center' : undefined,
                width: '100%',
                borderRadius: '8px',
                padding: collapsed ? '10px 8px' : '10px 12px',
                fontSize: '12px',
                fontWeight: 500,
                color: 'oklch(0.40 0.005 75)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {collapsed
                ? <ChevronRight className="h-4 w-4" style={{ flexShrink: 0 }} />
                : <><ChevronLeft className="h-4 w-4" style={{ flexShrink: 0 }} /><span>折り畳む</span></>
              }
            </button>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${GOLD}59, transparent)` }} />
      </aside>

      {/* モバイル: 背景オーバーレイ */}
      {mobileOpen && (
        <div
          className="fixed inset-0 md:hidden"
          style={{ zIndex: 199, background: 'oklch(0 0 0 / 0.6)' }}
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
    </>
  )
}
