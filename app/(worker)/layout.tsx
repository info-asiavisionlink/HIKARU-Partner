import { WorkerLayoutClient } from '@/components/layouts/WorkerLayout'

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'oklch(0.05 0.003 260)', minHeight: '100dvh' }}>
      <WorkerLayoutClient>{children}</WorkerLayoutClient>
    </div>
  )
}
