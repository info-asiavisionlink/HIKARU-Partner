export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatScore(score: number): string {
  return `${score}点`
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return '優秀'
  if (score >= 75) return '良好'
  if (score >= 60) return '普通'
  return '要改善'
}

export function truncate(str: string, length: number): string {
  return str.length <= length ? str : str.slice(0, length) + '…'
}
