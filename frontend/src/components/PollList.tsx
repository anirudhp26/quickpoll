'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Poll } from '@/types/poll'
import { apiClient } from '@/lib/api'
import PollCard from './PollCard'
import { FiAlertTriangle, FiLoader, FiPlusCircle } from 'react-icons/fi'
import { WSMessage } from '@/types/ws'

interface PollListProps {
  onOpenPoll?: (poll: Poll) => void
  onNewPoll?: () => void
}

type PollStatus = "active" | "expired"

export default function PollList({ onOpenPoll, onNewPoll }: PollListProps) {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<PollStatus>("active")

  const fetchPolls = async (currentStatus: PollStatus) => {
    setLoading(true)
    setError('')
    const response = await apiClient.getPolls(currentStatus)
    if (response.error) {
      setError(response.error)
    } else if (response.data) {
      setPolls(response.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPolls(status)

    const handlePollUpdate = (event: Event) => {
        const customEvent = event as CustomEvent
        const message = customEvent.detail as WSMessage
        const updatedPoll = message.data as Poll
        
        setPolls(prev => {
            const existingPollIndex = prev.findIndex(p => p.id === updatedPoll.id)
            console.log('existingPollIndex', existingPollIndex)
            console.log('updatedPoll', updatedPoll)
            console.log('prev', prev)
            if (existingPollIndex > -1) {
                // Update existing poll
                const newPolls = [...prev]
                newPolls[existingPollIndex] = {
                  ...prev[existingPollIndex],
                  ...updatedPoll
                }
                return newPolls.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            }
            // Add new poll to the start of the list
            return [updatedPoll, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        })
    }
    
    const handlePollDeleted = (event: Event) => {
        const customEvent = event as CustomEvent
        const { poll_id } = customEvent.detail
        setPolls(prev => prev.filter(poll => poll.id !== poll_id))
    }

    window.addEventListener('pollUpdate', handlePollUpdate)
    window.addEventListener('pollDeleted', handlePollDeleted)

    return () => {
        window.removeEventListener('pollUpdate', handlePollUpdate)
        window.removeEventListener('pollDeleted', handlePollDeleted)
    }
  }, [status])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <FiLoader className="w-10 h-10 text-gray-400 animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-300 font-medium">
          Loading Polls...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-6 py-5 rounded-lg">
        <div className="flex items-center">
            <FiAlertTriangle className="w-5 h-5 mr-3" />
            <p className="font-semibold">Error loading polls</p>
        </div>
        <p className="text-sm mt-2 mb-4 ml-8">{error}</p>
        <button
          onClick={() => fetchPolls(status)}
          className="text-sm font-semibold ml-8 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setStatus("active")}
            className={`${
              status === "active"
                ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-300"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500"
            } whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm transition-colors`}
          >
            Active Polls
          </button>
          <button
            onClick={() => setStatus("expired")}
            className={`${
              status === "expired"
                ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-300"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500"
            } whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm transition-colors`}
          >
            Expired Polls
          </button>
        </nav>
      </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
            {polls.map((poll) => (
                <motion.div
                    key={poll.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                >
                    <PollCard poll={poll} onClick={() => onOpenPoll?.(poll)} />
                </motion.div>
            ))}
            </AnimatePresence>
            {polls.length === 0 && !loading && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sm:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-20 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center"
                >
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                        No {status} polls yet!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {status === 'active' 
                            ? "Be the first to create a poll and see what others think."
                            : "There are no expired polls to show right now."
                        }
                    </p>
                    {status === 'active' && (
                        <button 
                            onClick={onNewPoll} 
                            className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <FiPlusCircle className="w-5 h-5" />
                            Create a Poll
                        </button>
                    )}
                </motion.div>
            )}
        </div>
    </div>
  )
}
