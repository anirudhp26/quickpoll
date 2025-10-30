'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PollCreate } from '@/types/poll'
import { apiClient } from '@/lib/api'

const EXPIRY_OPTIONS = [
  { label: '5 minutes', value: 300 },
  { label: '15 minutes', value: 900 },
  { label: '1 hour', value: 3600 },
  { label: '8 hours', value: 28800 },
  { label: '1 day', value: 86400 },
  { label: 'No expiry', value: null },
]

interface CreatePollModalProps {
  isOpen: boolean
  onClose: () => void
  onPollCreated: () => void
}

export default function CreatePollModal({ isOpen, onClose, onPollCreated }: CreatePollModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [expiresIn, setExpiresIn] = useState<number | null>(null)
  const [booster, setBooster] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClose = useCallback(() => {
    setTitle('')
    setDescription('')
    setOptions(['', ''])
    setExpiresIn(null)
    setBooster(false)
    setError('')
    onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleClose])

  const addOption = () => setOptions([...options, ''])

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Poll title is required')
      return
    }

    const validOptions = options.filter(opt => opt.trim())
    if (validOptions.length < 2) {
      setError('At least 2 options are required')
      return
    }

    setIsLoading(true)

    const pollData: PollCreate = {
      title: title.trim(),
      description: description.trim() || undefined,
      options: validOptions,
      booster,
      expires_in: expiresIn
    }

    const response = await apiClient.createPoll(pollData)

    if (response.error) {
      setError(response.error)
    } else {
      onPollCreated()
      handleClose()
    }

    setIsLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create a New Poll
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Poll Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="e.g., Favorite programming language?"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-gray-500 dark:text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-gray-800 resize-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="Add more context..."
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Options
            </label>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder={`Option ${index + 1}`}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900 dark:hover:text-red-400 rounded-full transition-colors"
                      aria-label="Remove option"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addOption}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium flex items-center gap-1.5 mt-3 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Option
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Poll Expiry
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXPIRY_OPTIONS.map(option => {
                const isSelected = expiresIn === option.value
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setExpiresIn(option.value)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <input
              type="checkbox"
              id="booster"
              checked={booster}
              onChange={(e) => setBooster(e.target.checked)}
              className="w-4 h-4 rounded mt-0.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="booster" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex-1">
              <span className="font-semibold">⚡ Enable Booster</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Get votes and likes from demo users to see activity on your poll.</p>
            </label>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 py-3 px-6 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed text-base"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating Poll...
              </span>
            ) : (
              'Create Poll'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
