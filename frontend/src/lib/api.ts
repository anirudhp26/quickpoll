const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Import session dynamically to avoid SSR issues
      const { getSessionId } = await import('./session')
      const sessionId = await getSessionId()

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        return { error: `HTTP ${response.status}: ${response.statusText}` }
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async getPolls(status: string = "active"): Promise<ApiResponse<any[]>> {
    return this.request(`/polls?status=${status}`)
  }

  async getPoll(pollId: number): Promise<ApiResponse<any>> {
    return this.request(`/polls/${pollId}`)
  }

  async createPoll(poll: any): Promise<ApiResponse<any>> {
    return this.request('/polls', {
      method: 'POST',
      body: JSON.stringify(poll),
    })
  }

  async vote(vote: any): Promise<ApiResponse<any>> {
    return this.request('/votes', {
      method: 'POST',
      body: JSON.stringify(vote),
    })
  }

  async likePoll(like: any): Promise<ApiResponse<any>> {
    return this.request('/likes', {
      method: 'POST',
      body: JSON.stringify(like),
    })
  }

  async unlikePoll(pollId: number): Promise<ApiResponse<any>> {
    return this.request(`/likes/${pollId}`, {
      method: 'DELETE',
    })
  }

  async getPollStats(pollId: number): Promise<ApiResponse<any>> {
    return this.request(`/polls/${pollId}/stats`)
  }
}

export const apiClient = new ApiClient()
