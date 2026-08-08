// ============================================================
// Toast bridge — dispatches CustomEvent that ToastProvider listens for.
// Callers do `toast.success('...')` / `toast.error('...')`.
// If ToastProvider isn't mounted, falls back to console.
// ============================================================

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastPayload {
  kind: ToastKind
  message: string
}

const EVENT_NAME = 'hikaru-toast'

function dispatch(kind: ToastKind, message: string) {
  if (typeof window === 'undefined') {
    // SSR — just log
    if (kind === 'error') console.error('[toast]', message)
    else console.log('[toast]', message)
    return
  }
  window.dispatchEvent(
    new CustomEvent<ToastPayload>(EVENT_NAME, { detail: { kind, message } })
  )
}

export const toast = {
  success: (msg: string) => dispatch('success', msg),
  error:   (msg: string) => dispatch('error',   msg),
  info:    (msg: string) => dispatch('info',    msg),
}

export const TOAST_EVENT = EVENT_NAME
