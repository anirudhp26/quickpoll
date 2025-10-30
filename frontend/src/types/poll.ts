export interface PollOption {
  id: number
  text: string
  poll_id: number
  vote_count: number
  created_at: string
}

export interface Poll {
  id: number
  title: string
  description: string | null
  is_active: boolean
  created_at: string
  user_id: number
  username?: string
  booster: boolean
  expires_in: number | null
  options: PollOption[]
  total_votes: number
  total_likes: number
  user_liked?: boolean
  user_voted_option_id?: number | null
}

export interface VoteCreate {
  poll_id: number
  option_id: number
}

export interface PollLikeCreate {
  poll_id: number
}

export interface PollCreate {
  title: string
  description?: string
  options: string[]
  booster: boolean
  expires_in?: number | null
}
