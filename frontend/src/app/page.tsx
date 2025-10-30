'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import PollList from '@/components/PollList'
import CreatePollModal from '@/components/CreatePollModal'
import PollModal from '@/components/PollModal'
import UserInfo from '@/components/UserInfo'
import { Poll } from '@/types/poll'
import { wsManager } from '@/lib/websocket'
import { apiClient } from '@/lib/api'
import { markSessionActive } from '@/lib/session'

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
  const [selectedPollId, setSelectedPollId] = useState<number | null>(null)

  const openPollModal = (poll: Poll) => {
    setSelectedPollId(poll.id)
    setIsPollModalOpen(true)
  }

  const closePollModal = () => {
    setIsPollModalOpen(false)
    setSelectedPollId(null)
  }

  // Initialize global WebSocket connection and session tracking
  useEffect(() => {
    // Mark session as active when page loads (async)
    markSessionActive().catch(console.error)

    // Connect to global WebSocket to listen for new polls
    wsManager.connectGlobal()

    // Listen for global poll_created events
    const handlePollCreated = (event: CustomEvent) => {
      console.log('New poll created:', event.detail)
    }

    window.addEventListener('pollCreated', handlePollCreated as EventListener)

    return () => {
      window.removeEventListener('pollCreated', handlePollCreated as EventListener)
    }
  }, [])

  return (
    <main className="min-h-screen py-8 px-4 relative overflow-hidden graph-bg">
      {/* Graph lines overlay */}
      <div className="graph-lines" />

      {/* Animated scanning line effect */}
      <motion.div
        className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent opacity-50"
        animate={{
          y: [0, 100, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      <div className="max-w-screen-2xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <motion.h1
            className="text-6xl font-extrabold text-gray-900 dark:text-white mb-4"
          >
            QuickPoll
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl text-gray-700 dark:text-gray-300 font-light mb-6"
          >
            Create instant polls and watch results in real-time
          </motion.p>

          {/* Create Poll Button */}
          <motion.button
            onClick={() => setIsCreateModalOpen(true)}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all border-2 border-black dark:border-white text-lg"
          >
            <span className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Poll
            </span>
          </motion.button>
        </motion.div>

        {/* Poll List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <PollList
            onOpenPoll={openPollModal}
          />
        </motion.div>
      </div>

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPollCreated={() => setRefreshTrigger(refreshTrigger + 1)}
      />

      {/* Poll Detail Modal */}
      <PollModal
        pollId={selectedPollId}
        isOpen={isPollModalOpen}
        onClose={closePollModal}
        onVote={async (pollId: number, optionId: number) => {
          // Handle voting in modal
          await apiClient.vote({ poll_id: pollId, option_id: optionId })
          setRefreshTrigger(refreshTrigger + 1)
        }}
        onLike={async (pollId: number) => {
          await apiClient.likePoll({ poll_id: pollId })
          setRefreshTrigger(refreshTrigger + 1)
        }}
        onUnlike={async (pollId: number) => {
          await apiClient.unlikePoll(pollId)
          setRefreshTrigger(refreshTrigger + 1)
        }}
      />

      {/* User Info Panel */}
      <UserInfo />
    </main>
  )
}
