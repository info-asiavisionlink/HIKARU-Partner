import { BottomNav } from '@/components/layouts/BottomNav'

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-16" style={{ background: 'oklch(0.05 0.003 260)' }}>
      {children}
      <BottomNav />
    </div>
  )
}
