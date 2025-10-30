/**
 * Browser Fingerprinting Utility
 * Creates a stable, unique identifier based on browser/device characteristics
 * This allows user identification even when switching browsers or clearing localStorage
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs'

const FINGERPRINT_KEY = 'poll_fingerprint_id'
const FINGERPRINT_CACHE_KEY = 'poll_fingerprint_cache'

interface FingerprintCache {
  visitorId: string
  timestamp: number
}

/**
 * Get fingerprint ID with caching for 24 hours
 */
export async function getFingerprintId(): Promise<string> {
  // Check cache first (refresh every 24 hours)
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(FINGERPRINT_CACHE_KEY)
    if (cached) {
      try {
        const cache: FingerprintCache = JSON.parse(cached)
        const age = Date.now() - cache.timestamp
        // Cache is valid for 24 hours
        if (age < 24 * 60 * 60 * 1000 && cache.visitorId) {
          return cache.visitorId
        }
      } catch (e) {
        console.error('Failed to parse fingerprint cache', e)
      }
    }
  }

  // Generate new fingerprint
  try {
    const fp = await FingerprintJS.load()
    const result = await fp.get()
    const visitorId = result.visitorId

    // Cache the result
    if (typeof window !== 'undefined') {
      localStorage.setItem(FINGERPRINT_CACHE_KEY, JSON.stringify({
        visitorId,
        timestamp: Date.now()
      }))
    }

    return visitorId
  } catch (error) {
    console.error('Fingerprint generation failed:', error)
    // Fallback to a simple UUID-based approach
    return generateFallbackId()
  }
}

/**
 * Fallback ID generation if fingerprinting fails
 */
function generateFallbackId(): string {
  if (typeof window === 'undefined') {
    return generateUUID()
  }

  // Try to get an existing fallback ID
  let fallbackId = localStorage.getItem(FINGERPRINT_KEY)
  if (!fallbackId) {
    fallbackId = generateUUID()
    localStorage.setItem(FINGERPRINT_KEY, fallbackId)
  }

  return fallbackId
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Get current user identifier for display
 */
export async function getCurrentUserId(): Promise<string> {
  const fingerprintId = await getFingerprintId()
  // Take first 8 characters for display
  const shortId = fingerprintId.substring(0, 8)
  return `visitor_${shortId}`
}

/**
 * Get full fingerprint information
 */
export async function getFingerprintInfo() {
  const fingerprintId = await getFingerprintId()
  const userId = await getCurrentUserId()

  return {
    fingerprintId,
    userId,
    created: localStorage.getItem(`${FINGERPRINT_KEY}_created`) || 'unknown',
  }
}

/**
 * Reset fingerprint (for testing purposes)
 */
export function resetFingerprint(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(FINGERPRINT_KEY)
    localStorage.removeItem(FINGERPRINT_CACHE_KEY)
    localStorage.removeItem(`${FINGERPRINT_KEY}_created`)
  }
}

