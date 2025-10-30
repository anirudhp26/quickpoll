'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSessionInfo, resetSessionId } from '@/lib/session'
import { FiChevronUp, FiRefreshCw, FiUser, FiHash, FiCalendar } from 'react-icons/fi'

interface SessionInfo {
  fingerprintId?: string
  userId?: string
  created?: string
}

export default function UserInfo() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({})
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadSession = async () => {
    try {
      const info = await getSessionInfo()
      setSessionInfo(info)
    } catch (error) {
      console.error('Failed to load session info:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSession()
    window.addEventListener('sessionActive', loadSession)
    window.addEventListener('sessionReset', loadSession)

    return () => {
      window.removeEventListener('sessionActive', loadSession)
      window.removeEventListener('sessionReset', loadSession)
    }
  }, [])

  const handleResetSession = async () => {
    await resetSessionId()
    loadSession()
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-72"
            >
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                  Session Information
                </h3>
                <div className="space-y-2 text-xs">
                  <InfoRow icon={<FiUser />} label="Display Name" value={sessionInfo.userId} isLoading={loading} />
                  <InfoRow icon={<FiHash />} label="Fingerprint ID" value={sessionInfo.fingerprintId?.substring(0, 12) + '...'} isLoading={loading} />
                  <InfoRow icon={<FiCalendar />} label="Session Start" value={sessionInfo.created ? new Date(sessionInfo.created).toLocaleString() : ''} isLoading={loading} />
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleResetSession}
                    className="w-full flex items-center justify-center gap-2 text-xs bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/80 rounded-lg py-2 px-3 transition-colors"
                  >
                    <FiRefreshCw className="w-3.5 h-3.5" />
                    Reset Session
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          whileTap={{ scale: 0.95 }}
          className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
        >
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-gray-400' : 'bg-green-500 animate-pulse'}`}></div>
          <span className="font-medium">
            {loading ? 'Connecting...' : (sessionInfo.userId || 'Guest User')}
          </span>
          <FiChevronUp className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </motion.button>
      </motion.div>
    </div>
  )
}

const InfoRow = ({ icon, label, value, isLoading }: { icon: React.ReactNode, label: string, value?: string, isLoading: boolean }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
      {icon}
      <span>{label}:</span>
    </div>
    {isLoading ? (
      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full w-24 animate-pulse"></div>
    ) : (
      <span className="text-gray-800 dark:text-white font-mono">{value || 'N/A'}</span>
    )}
  </div>
)
