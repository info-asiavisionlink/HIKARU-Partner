import type { Metadata, Viewport } from 'next'
import { ToastProvider } from '@/components/providers/ToastProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'HIKARU Partner',
  description: '協力会社向けシステム',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
