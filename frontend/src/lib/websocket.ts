import { WSMessage } from '@/types/ws'

export class WebSocketManager {
  private connections: Map<number, WebSocket> = new Map()
  private globalConnection: WebSocket | null = null
  private reconnectAttempts: Map<number, number> = new Map()
  private maxReconnectAttempts = 5

  /**
   * Connects to the global WebSocket for listening to poll_created events
   */
  connectGlobal() {
    if (this.globalConnection && this.globalConnection.readyState === WebSocket.OPEN) {
      return
    }

    // Use poll_id 0 as a special case for global updates
    const wsUrl = `ws://localhost:8000/ws/0`
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        
        // Handle different message types
        switch (message.type) {
          case 'poll_created':
          case 'poll_update':
          case 'vote_cast':
          case 'poll_liked':
          case 'poll_unliked':
            window.dispatchEvent(
              new CustomEvent('pollUpdate', { detail: message })
            )
            break
          case 'poll_deleted':
            window.dispatchEvent(
              new CustomEvent('pollDeleted', { detail: { poll_id: message.poll_id } })
            )
            break
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onclose = () => {
      this.globalConnection = null
      // Reconnect after a delay
      setTimeout(() => this.connectGlobal(), 3000)
    }

    ws.onerror = (error) => {
      console.error('Global WebSocket error:', error)
    }

    this.globalConnection = ws
  }

  connect(pollId: number): WebSocket {
    if (this.connections.has(pollId)) {
      return this.connections.get(pollId)!
    }

    const wsUrl = `ws://localhost:8000/ws/${pollId}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      this.reconnectAttempts.set(pollId, 0)
    }

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        this.handleMessage(pollId, message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onclose = () => {
      this.connections.delete(pollId)

      // Attempt to reconnect
      const attempts = this.reconnectAttempts.get(pollId) || 0
      if (attempts < this.maxReconnectAttempts) {
        this.reconnectAttempts.set(pollId, attempts + 1)
        setTimeout(() => this.connect(pollId), 1000 * (attempts + 1))
      }
    }

    ws.onerror = (error) => {
      console.error(`WebSocket error for poll ${pollId}:`, error)
    }

    this.connections.set(pollId, ws)
    return ws
  }

  disconnect(pollId: number) {
    const ws = this.connections.get(pollId)
    if (ws) {
      ws.close()
      this.connections.delete(pollId)
      this.reconnectAttempts.delete(pollId)
    }
  }

  private handleMessage(pollId: number, message: WSMessage) {
    // Emit custom event that components can listen to
    window.dispatchEvent(
      new CustomEvent('pollUpdate', {
        detail: { pollId, ...message }
      })
    )
  }

  sendMessage(pollId: number, message: any) {
    const ws = this.connections.get(pollId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }
}

export const wsManager = new WebSocketManager()
