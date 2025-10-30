'use client'

import { useEffect, useCallback } from 'react'
import { wsManager } from './websocket'
import { WSMessage } from '@/types/poll'

interface UseWebSocketProps {
  pollId: number
  onMessage?: (message: WSMessage) => void
}

export function useWebSocket({ pollId, onMessage }: UseWebSocketProps) {
  useEffect(() => {
    if (pollId) {
      wsManager.connect(pollId)
    }

    return () => {
      wsManager.disconnect(pollId)
    }
  }, [pollId])

  useEffect(() => {
    if (!onMessage) return

    const handleMessage = (event: CustomEvent) => {
      if (event.detail.pollId === pollId) {
        onMessage(event.detail.message)
      }
    }

    window.addEventListener('pollUpdate', handleMessage as EventListener)

    return () => {
      window.removeEventListener('pollUpdate', handleMessage as EventListener)
    }
  }, [pollId, onMessage])

  const sendMessage = useCallback((message: any) => {
    wsManager.sendMessage(pollId, message)
  }, [pollId])

  return { sendMessage }
}
