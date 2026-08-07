import { LoginForm } from './_components/LoginForm'

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-8">
      {/* ロゴ */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black"
          style={{
            background: 'linear-gradient(135deg, oklch(0.52 0.10 75), oklch(0.73 0.12 78))',
            boxShadow: '0 0 32px oklch(0.73 0.12 78 / 0.35)',
            color: 'oklch(0.08 0.005 60)',
          }}
        >
          H
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold" style={{ color: 'oklch(0.88 0.008 75)' }}>
            HIKARU Partner
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'oklch(0.50 0.007 75)' }}>
            協力会社向けシステムへようこそ
          </p>
        </div>
      </div>

      <div
        className="rounded-2xl p-6"
        style={{
          background: 'oklch(0.09 0.005 255 / 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid oklch(0.73 0.12 78 / 0.20)',
          boxShadow: '0 0 40px oklch(0 0 0 / 0.4)',
        }}
      >
        <h2 className="text-base font-semibold mb-5" style={{ color: 'oklch(0.88 0.008 75)' }}>
          ログイン
        </h2>
        <LoginForm />
      </div>

      <p className="text-center text-xs" style={{ color: 'oklch(0.35 0.005 75)' }}>
        このシステムは協力会社様専用です。<br />
        管理者の方は HIKARU CONSOLE をご利用ください。
      </p>
    </div>
  )
}
