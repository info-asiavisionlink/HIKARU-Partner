/**
 * JST (Asia/Tokyo) 日付ユーティリティ
 *
 * Vercel はデフォルト UTC 環境で動作するため、
 * new Date().toISOString().split('T')[0] は UTC 日付を返し、
 * 日本時間 0:00〜8:59 の間に実行すると前日の日付になる。
 *
 * DATE 型の業務日（work_date 等）は日本時間の「今日」を
 * 正確に返す必要があるため、このユーティリティを使用する。
 *
 * 対象外（変更禁止）:
 *   TIMESTAMPTZ 型（started_at / completed_at / created_at 等）は
 *   UTC 絶対時刻で保存するのが正しいため new Date().toISOString() のまま。
 */

/** Asia/Tokyo 基準で今日の YYYY-MM-DD を返す */
export function getJstDateString(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}
