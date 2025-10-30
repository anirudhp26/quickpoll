import { formatDistanceToNow, parseISO, isValid } from 'date-fns'

export function timeAgo(date: string | Date): string {
  if (!date) return ''
  
  try {
    const utcDate = typeof date === 'string' ? parseISO(date) : date
    
    if (!isValid(utcDate)) {
      console.warn('Invalid date passed to timeAgo:', date)
      return ''
    }

    // parseISO already treats the date as UTC and converts it to local time
    // No additional conversion needed!
    return formatDistanceToNow(utcDate, { addSuffix: true })
      .replace('about ', '')
      .replace('less than a minute', 'just now')
  } catch (error) {
    console.error('Error in timeAgo:', error)
    return ''
  }
}