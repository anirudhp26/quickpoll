from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Poll schemas
class PollBase(BaseModel):
    title: str
    description: Optional[str] = None

class PollCreate(PollBase):
    options: List[str]  # List of option texts
    booster: bool = False
    expires_in: Optional[int] = None  # seconds, max 86400 (1 day)

class PollOption(BaseModel):
    id: int
    text: str
    poll_id: Optional[int]
    vote_count: int = 0
    created_at: Optional[datetime]
    percentage: int = 0

    class Config:
        from_attributes = True

class Poll(PollBase):
    id: int
    is_active: bool
    created_at: datetime
    user_id: int
    username: Optional[str] = None
    booster: bool = False
    expires_in: Optional[int] = None
    title: str
    description: Optional[str] = None
    options: List[PollOption]
    total_votes: int = 0
    total_likes: int = 0
    user_liked: bool = False
    user_voted_option_id: Optional[int] = None

    class Config:
        from_attributes = True

# Vote schemas
class VoteBase(BaseModel):
    poll_id: int
    option_id: int

class VoteCreate(VoteBase):
    pass

class Vote(VoteBase):
    id: int
    user_id: int
    created_at: datetime
    session_id: Optional[str] = None  # For client to track their vote

    class Config:
        from_attributes = True

# Like schemas
class PollLikeBase(BaseModel):
    poll_id: int

class PollLikeCreate(PollLikeBase):
    pass

class PollLike(PollLikeBase):
    id: int
    user_id: int
    created_at: datetime
    session_id: Optional[str] = None  # For client to track their like

    class Config:
        from_attributes = True

# Stats schemas
class PollStats(BaseModel):
    total_votes: int
    total_likes: int
    option_stats: List[dict]

# WebSocket message schemas
class WSMessage(BaseModel):
    type: str  # "vote", "like", "poll_created", "poll_updated"
    poll_id: int
    data: dict
