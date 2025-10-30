'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'
import { Poll } from '@/types/poll'
import AnimatedNumber from './AnimatedNumber'
import { timeAgo } from '@/lib/timeAgo'
import { FiBarChart2, FiHeart, FiClock, FiZap } from 'react-icons/fi'
import { formatTimeRemaining } from '@/lib/time'

interface PollCardProps {
  poll: Poll
  onClick?: () => void
}

export default function PollCard({ poll, onClick }: PollCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('')
  
  useEffect(() => {
    const updateTime = () => setTimeRemaining(formatTimeRemaining(poll.expires_in, poll.created_at))
    updateTime()
    if (poll.expires_in) {
      const interval = setInterval(updateTime, 1000)
      return () => clearInterval(interval)
    }
  }, [poll.expires_in, poll.created_at])
  
  const getPercentage = (votes: number) => {
    return poll.total_votes > 0 ? Math.round((votes / poll.total_votes) * 100) : 0
  }

  const cardContent = useMemo(() => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 dark:border-gray-700 p-5 flex flex-col h-full">
      <div className="flex-grow">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-2">
          {poll.title}
        </h3>
        {poll.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2 mb-4">
            {poll.description}
          </p>
        )}
      </div>

      <div className="flex-grow" />

      <div className="flex justify-between items-end text-xs text-gray-500 dark:text-gray-400 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1" title="Total Votes">
              <FiBarChart2 className="w-3.5 h-3.5" />
              <AnimatedNumber value={poll.total_votes} className="font-semibold" />
            </div>
            <div className="flex items-center gap-1" title="Total Likes">
              <FiHeart className="w-3.5 h-3.5" />
              <AnimatedNumber value={poll.total_likes} className="font-semibold" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {poll.booster && <FiZap className="w-3.5 h-3.5 text-yellow-500" title="Boosted Poll" />}
            {timeRemaining ? (
              timeRemaining === 'Expired' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  Expired
                </span>
              ) : (
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold" title="Time Remaining">
                  <FiClock className="w-3.5 h-3.5" />
                  <span>{timeRemaining}</span>
                </div>
              )
            ) : <div className="w-3.5 h-3.5" />}
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          {poll.username && <span className="font-semibold mb-1">{poll.username}</span>}
          <span title={`Created at ${new Date(poll.created_at).toLocaleString()}`}>{timeAgo(poll.created_at)}</span>
        </div>
      </div>
    </div>
  ), [poll, timeRemaining]);

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`cursor-pointer h-full ${onClick ? 'transform hover:-translate-y-1 transition-transform' : ''}`}
    >
      {cardContent}
    </motion.div>
  )
}
