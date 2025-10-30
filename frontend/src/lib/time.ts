
export function formatTimeRemaining(expiresIn: number | null, createdAt: string): string {
  if (!expiresIn) return ''
  
  const created = new Date(createdAt)
  const now = new Date()
  
  // Adjust for local timezone offset
  const createdLocal = new Date(created.getTime());
  
  const elapsed = Math.floor((now.getTime() - createdLocal.getTime()) / 1000)
  const remaining = expiresIn - elapsed
  
  if (remaining <= 0) return 'Expired'
  
  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60
  
  if (hours > 0) return `${hours}h ${minutes}m left`
  if (minutes >= 5) return `${minutes}m left`
  if (minutes > 0) return `${minutes}m ${seconds}s left`
  return `${seconds}s left`
}
