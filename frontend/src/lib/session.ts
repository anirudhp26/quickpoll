/**
 * Session Management Utility
 * Uses browser fingerprinting to create a stable user ID across browsers/devices
 */

const SESSION_KEY = 'poll_session_id'

// Store fingerprint promise to avoid multiple calls
let fingerprintPromise: Promise<string> | null = null

/**
 * Gets or creates a session ID using fingerprinting
 * This creates a stable ID that persists across browser switches
 */
export async function getSessionId(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'unknown'
  }

  // Return cached promise if already generating
  if (fingerprintPromise) {
    return fingerprintPromise
  }

  fingerprintPromise = (async () => {
    try {
      const { getFingerprintId } = await import('./fingerprint')
      return await getFingerprintId()
    } catch (error) {
      console.error('Failed to get fingerprint:', error)
      // Fallback to localStorage-based ID
      let sessionId = localStorage.getItem(SESSION_KEY)
      if (!sessionId) {
        sessionId = generateUUID()
        localStorage.setItem(SESSION_KEY, sessionId)
      }
      return sessionId
    }
  })()

  return fingerprintPromise
}

/**
 * Synchronous fallback for immediate access (returns placeholder)
 * Use getSessionId() for actual ID
 */
export function getSessionIdSync(): string {
  if (typeof window === 'undefined') {
    return 'loading'
  }
  return localStorage.getItem(SESSION_KEY) || 'loading'
}

/**
 * Generates a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Gets the current user's display name
 */
export async function getCurrentUser(): Promise<string> {
  const sessionId = await getSessionId()
  // Take first 8 characters for display
  const shortId = sessionId.substring(0, 8)
  return `visitor_${shortId}`
}

/**
 * Gets detailed session information
 */
export async function getSessionInfo() {
  const sessionId = await getSessionId()
  const userId = await getCurrentUser()

  return {
    fingerprintId: sessionId,
    sessionId,
    userId,
    created: localStorage.getItem(`${SESSION_KEY}_created`) || 'unknown',
  }
}

/**
 * Marks session as used (for tracking when user becomes active)
 */
export async function markSessionActive(): Promise<void> {
  if (typeof window !== 'undefined') {
    const sessionId = await getSessionId()
    localStorage.setItem(`${SESSION_KEY}_created`, new Date().toISOString())
    localStorage.setItem(`${SESSION_KEY}_last_active`, new Date().toISOString())

    // Dispatch custom event for session activity
    window.dispatchEvent(new CustomEvent('sessionActive', {
      detail: { sessionId, timestamp: new Date().toISOString() }
    }))
  }
}

/**
 * Resets the session ID
 * Useful for testing or logout functionality
 */
export async function resetSessionId(): Promise<void> {
  if (typeof window !== 'undefined') {
    const oldSessionId = await getSessionId()
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(`${SESSION_KEY}_created`)
    localStorage.removeItem(`${SESSION_KEY}_last_active`)
    
    // Reset fingerprint cache
    try {
      const { resetFingerprint } = await import('./fingerprint')
      resetFingerprint()
    } catch (e) {
      console.error('Failed to reset fingerprint:', e)
    }

    // Dispatch event for session reset
    window.dispatchEvent(new CustomEvent('sessionReset', {
      detail: { oldSessionId, timestamp: new Date().toISOString() }
    }))
    
    // Clear the fingerprint promise so it regenerates
    fingerprintPromise = null
  }
}

