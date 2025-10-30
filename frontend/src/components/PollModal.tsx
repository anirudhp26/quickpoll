'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Poll } from '@/types/poll'
import AnimatedNumber from './AnimatedNumber'
import { timeAgo } from '@/lib/timeAgo'
import { FiX, FiHeart, FiBarChart2, FiClock, FiZap, FiUser, FiCheckCircle } from 'react-icons/fi'
import { WSMessage } from '@/types/ws'
import { apiClient } from '@/lib/api'
import { formatTimeRemaining } from '@/lib/time'

interface PollModalProps {
  pollId: number | null
  isOpen: boolean
  onClose: () => void
  onVote?: (pollId: number, optionId: number) => void
  onLike?: (pollId: number) => void
  onUnlike?: (pollId: number) => void
}

export default function PollModal({ pollId, isOpen, onClose, onVote, onLike, onUnlike }: PollModalProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [hasLiked, setHasLiked] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null)
  const [timeRemaining, setTimeRemaining] = useState('')

  useEffect(() => {
    if (currentPoll?.expires_in) {
      const interval = setInterval(() => {
        const remaining = formatTimeRemaining(currentPoll.expires_in, currentPoll.created_at)
        setTimeRemaining(remaining)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [currentPoll?.expires_in, currentPoll?.created_at])

  useEffect(() => {
    const fetchPollData = async () => {
      if (pollId) {
        const { data, error } = await apiClient.getPoll(pollId)
        if (data) {
          setCurrentPoll(data)
          setHasLiked(data.user_liked || false)
          setSelectedOption(data.user_voted_option_id || null)
        } else {
          console.error("Failed to fetch poll data:", error)
          onClose() // Close modal if poll data fails to load
        }
      }
    }
    if (isOpen) {
      fetchPollData()
    }
  }, [pollId, isOpen, onClose])

  useEffect(() => {
    if (!currentPoll) return

    const handlePollUpdate = (event: CustomEvent) => {
      const message = event.detail as WSMessage
      const updatedPoll = message.data as Poll
      if (updatedPoll.id === currentPoll.id) {
        setCurrentPoll({
          ...currentPoll,
          ...updatedPoll,

        })
      }
    }

    window.addEventListener('pollUpdate', handlePollUpdate as EventListener)
    return () => window.removeEventListener('pollUpdate', handlePollUpdate as EventListener)
  }, [currentPoll])

  useEffect(() => {
    // Reset state only when the pollId changes, not on every re-render of the modal
    if (pollId) {
        setHasLiked(false)
        setSelectedOption(null)
        setIsVoting(false)
    }
  }, [pollId])

  const handleVote = useCallback(async (optionId: number) => {
    if (isVoting || !currentPoll) return
    setIsVoting(true)
    setSelectedOption(optionId)
    try {
      onVote?.(currentPoll.id, optionId)
    } finally {
      setIsVoting(false)
    }
  }, [currentPoll, isVoting, onVote])

  const handleLike = useCallback(async () => {
    if (!currentPoll) return
    const newLikedState = !hasLiked
    setHasLiked(newLikedState)
    
    if (newLikedState) {
      onLike?.(currentPoll.id)
    } else {
      onUnlike?.(currentPoll.id)
    }
  }, [currentPoll, onLike, onUnlike, hasLiked])

  const getPercentage = (votes: number) => {
    return currentPoll?.total_votes && currentPoll.total_votes > 0 
      ? Math.round((votes / currentPoll.total_votes) * 100) 
      : 0
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && isOpen && onClose()
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && currentPoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 pr-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {currentPoll.title}
                </h2>
                {currentPoll.description && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {currentPoll.description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors absolute top-4 right-4"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex items-center gap-1.5"><FiUser /><span>By {currentPoll.username}</span></div>
              <div className="flex items-center gap-1.5"><FiBarChart2 /><span><AnimatedNumber value={currentPoll.total_votes} /> votes</span></div>
              {currentPoll.booster && <div className="flex items-center gap-1.5 text-yellow-500"><FiZap /><span>Boosted</span></div>}
              {timeRemaining && <div className="flex items-center gap-1.5 text-orange-500"><FiClock /><span>{timeRemaining}</span></div>}
            </div>

            <div className="space-y-3">
              {currentPoll.options.map(option => {
                const percentage = getPercentage(option.vote_count)
                const isSelected = selectedOption === option.id
                return (
                  <motion.div
                    key={option.id}
                    layout
                    className="relative"
                  >
                    <button
                      onClick={() => handleVote(option.id)}
                      disabled={isVoting}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 bg-transparent hover:border-blue-400 dark:hover:border-blue-500'
                      } ${isVoting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex justify-between items-center text-sm font-medium text-gray-800 dark:text-gray-100 mb-1.5">
                        <span>{option.text}</span>
                        <div className="flex items-center gap-2">
                          {isSelected && <FiCheckCircle className="w-4 h-4 text-blue-500" />}
                          <span><AnimatedNumber value={percentage} />%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <motion.div
                          className="h-2 rounded-full bg-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </button>
                  </motion.div>
                )
              })}
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(currentPoll.created_at)}</span>
              <motion.button
                onClick={handleLike}
                whileTap={{ scale: 0.9 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-colors duration-200 ${
                  hasLiked 
                    ? 'bg-red-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-red-100 dark:hover:bg-red-900/50'
                }`}
              >
                <FiHeart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
                <AnimatedNumber value={currentPoll.total_likes} />
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
