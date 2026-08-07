export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4"
      style={{ background: 'oklch(0.05 0.003 260)' }}>
      {children}
    </div>
  )
}
