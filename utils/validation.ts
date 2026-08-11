export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,
  pdf:   20 * 1024 * 1024,
  video: 100 * 1024 * 1024,
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidImageFile(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
}

export function isValidPdfFile(file: File): boolean {
  return file.type === 'application/pdf'
}

export function isValidVideoFile(file: File): boolean {
  return ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)
}

export function isWithinFileSizeLimit(file: File, type: keyof typeof FILE_SIZE_LIMITS): boolean {
  return file.size <= FILE_SIZE_LIMITS[type]
}
