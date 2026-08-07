import { PartnerLayoutClient } from '@/components/layouts/PartnerLayout'

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'oklch(0.05 0.003 260)', minHeight: '100dvh' }}>
      <PartnerLayoutClient>{children}</PartnerLayoutClient>
    </div>
  )
}
